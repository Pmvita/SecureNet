✅ **Integrated in Phase 3** – See [phase guide](../integration/phase-3-advanced-tooling.md)

# Optuna - Hyperparameter Optimization

Optuna is an automatic hyperparameter optimization software framework, particularly designed for machine learning. It features an imperative, define-by-run style user API.

## 🎯 Purpose for SecureNet

- **Automated Hyperparameter Tuning** - Optimize ML model performance automatically
- **Multi-objective Optimization** - Balance accuracy, speed, and resource usage
- **Efficient Search** - Use advanced algorithms like TPE and CMA-ES
- **Distributed Optimization** - Scale hyperparameter search across multiple machines
- **Model Selection** - Compare different model architectures automatically

## 📦 Installation

```bash
pip install optuna
pip install optuna-dashboard  # Optional: Web dashboard
```

## 🔧 Integration

### Core Hyperparameter Optimization

**File**: `ml/hyperparameter_optimization.py`

```python
import optuna
from optuna.integration import MLflowCallback
from optuna.pruners import MedianPruner
from optuna.samplers import TPESampler
import mlflow
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.svm import OneClassSVM
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from typing import Dict, List, Any, Optional, Tuple
import structlog
import joblib
from datetime import datetime

logger = structlog.get_logger()

class SecureNetOptimizer:
    """Hyperparameter optimization for SecureNet ML models"""
    
    def __init__(self, 
                 study_name: str = "securenet_optimization",
                 storage_url: str = "sqlite:///optuna_studies.db",
                 mlflow_tracking_uri: str = "http://localhost:5000"):
        
        self.study_name = study_name
        self.storage_url = storage_url
        self.mlflow_tracking_uri = mlflow_tracking_uri
        
        # Setup MLflow
        mlflow.set_tracking_uri(mlflow_tracking_uri)
        
        # Create study with advanced configuration
        self.study = optuna.create_study(
            study_name=study_name,
            storage=storage_url,
            direction="maximize",  # Maximize F1 score
            sampler=TPESampler(seed=42),
            pruner=MedianPruner(n_startup_trials=5, n_warmup_steps=10),
            load_if_exists=True
        )
        
        # MLflow callback for logging
        self.mlflow_callback = MLflowCallback(
            tracking_uri=mlflow_tracking_uri,
            metric_name="f1_score"
        )
    
    def optimize_anomaly_detection(self, 
                                  X_train: np.ndarray, 
                                  y_train: np.ndarray,
                                  X_val: np.ndarray,
                                  y_val: np.ndarray,
                                  n_trials: int = 100,
                                  timeout: int = 3600) -> Dict[str, Any]:
        """
        Optimize anomaly detection models
        
        Args:
            X_train: Training features
            y_train: Training labels (1 for normal, -1 for anomaly)
            X_val: Validation features  
            y_val: Validation labels
            n_trials: Number of optimization trials
            timeout: Timeout in seconds
            
        Returns:
            Best parameters and model performance
        """
        
        def objective(trial):
            # Suggest model type
            model_type = trial.suggest_categorical(
                'model_type', 
                ['isolation_forest', 'one_class_svm', 'autoencoder']
            )
            
            # Model-specific hyperparameters
            if model_type == 'isolation_forest':
                model = self._optimize_isolation_forest(trial, X_train, y_train, X_val, y_val)
            elif model_type == 'one_class_svm':
                model = self._optimize_one_class_svm(trial, X_train, y_train, X_val, y_val)
            else:  # autoencoder
                model = self._optimize_autoencoder(trial, X_train, y_train, X_val, y_val)
            
            return model['f1_score']
        
        # Run optimization
        self.study.optimize(
            objective, 
            n_trials=n_trials, 
            timeout=timeout,
            callbacks=[self.mlflow_callback]
        )
        
        # Get best results
        best_trial = self.study.best_trial
        
        logger.info(
            "Optimization completed",
            best_f1_score=best_trial.value,
            best_params=best_trial.params,
            n_trials=len(self.study.trials)
        )
        
        return {
            'best_params': best_trial.params,
            'best_score': best_trial.value,
            'study': self.study,
            'n_trials': len(self.study.trials)
        }
    
    def _optimize_isolation_forest(self, trial, X_train, y_train, X_val, y_val) -> Dict[str, float]:
        """Optimize Isolation Forest hyperparameters"""
        
        # Suggest hyperparameters
        n_estimators = trial.suggest_int('n_estimators', 50, 300)
        contamination = trial.suggest_float('contamination', 0.01, 0.3)
        max_features = trial.suggest_float('max_features', 0.1, 1.0)
        max_samples = trial.suggest_categorical('max_samples', ['auto', 0.5, 0.7, 0.9])
        
        # Create and train model
        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_features=max_features,
            max_samples=max_samples,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train)
        
        # Predict on validation set
        y_pred = model.predict(X_val)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_val, y_pred)
        
        # Log additional metrics to trial
        trial.set_user_attr('accuracy', metrics['accuracy'])
        trial.set_user_attr('precision', metrics['precision'])
        trial.set_user_attr('recall', metrics['recall'])
        
        return metrics
    
    def _optimize_one_class_svm(self, trial, X_train, y_train, X_val, y_val) -> Dict[str, float]:
        """Optimize One-Class SVM hyperparameters"""
        
        # Suggest hyperparameters
        kernel = trial.suggest_categorical('kernel', ['rbf', 'poly', 'sigmoid'])
        gamma = trial.suggest_categorical('gamma', ['scale', 'auto'])
        nu = trial.suggest_float('nu', 0.01, 0.5)
        
        if kernel == 'poly':
            degree = trial.suggest_int('degree', 2, 5)
        else:
            degree = 3
        
        # Scale features for SVM
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)
        
        # Create and train model
        model = OneClassSVM(
            kernel=kernel,
            gamma=gamma,
            nu=nu,
            degree=degree
        )
        
        model.fit(X_train_scaled)
        
        # Predict on validation set
        y_pred = model.predict(X_val_scaled)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_val, y_pred)
        
        # Log additional metrics
        trial.set_user_attr('accuracy', metrics['accuracy'])
        trial.set_user_attr('precision', metrics['precision'])
        trial.set_user_attr('recall', metrics['recall'])
        
        return metrics
    
    def _optimize_autoencoder(self, trial, X_train, y_train, X_val, y_val) -> Dict[str, float]:
        """Optimize Autoencoder hyperparameters"""
        
        # Suggest hyperparameters
        hidden_layer_sizes = []
        n_layers = trial.suggest_int('n_layers', 1, 4)
        
        for i in range(n_layers):
            size = trial.suggest_int(f'layer_{i}_size', 10, 200)
            hidden_layer_sizes.append(size)
        
        learning_rate = trial.suggest_float('learning_rate', 1e-5, 1e-1, log=True)
        alpha = trial.suggest_float('alpha', 1e-6, 1e-2, log=True)
        max_iter = trial.suggest_int('max_iter', 100, 1000)
        
        # Create autoencoder (using MLPClassifier as approximation)
        model = MLPClassifier(
            hidden_layer_sizes=tuple(hidden_layer_sizes),
            learning_rate_init=learning_rate,
            alpha=alpha,
            max_iter=max_iter,
            random_state=42
        )
        
        # Train on normal data only (anomaly detection approach)
        normal_mask = y_train == 1
        X_normal = X_train[normal_mask]
        
        # Scale features
        scaler = StandardScaler()
        X_normal_scaled = scaler.fit_transform(X_normal)
        X_val_scaled = scaler.transform(X_val)
        
        # Train autoencoder (simplified approach)
        model.fit(X_normal_scaled, X_normal_scaled)
        
        # Calculate reconstruction error for anomaly detection
        reconstruction_errors = np.mean((X_val_scaled - model.predict(X_val_scaled))**2, axis=1)
        threshold = np.percentile(reconstruction_errors, 90)  # Top 10% as anomalies
        
        y_pred = np.where(reconstruction_errors > threshold, -1, 1)
        
        # Calculate metrics
        metrics = self._calculate_metrics(y_val, y_pred)
        
        return metrics
    
    def _calculate_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
        """Calculate evaluation metrics"""
        
        # Convert to binary classification format (0/1 instead of -1/1)
        y_true_binary = (y_true == 1).astype(int)
        y_pred_binary = (y_pred == 1).astype(int)
        
        accuracy = accuracy_score(y_true_binary, y_pred_binary)
        precision = precision_score(y_true_binary, y_pred_binary, zero_division=0)
        recall = recall_score(y_true_binary, y_pred_binary, zero_division=0)
        f1 = f1_score(y_true_binary, y_pred_binary, zero_division=0)
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1
        }
    
    def optimize_threat_classification(self, 
                                     X_train: np.ndarray, 
                                     y_train: np.ndarray,
                                     X_val: np.ndarray,
                                     y_val: np.ndarray,
                                     n_trials: int = 100) -> Dict[str, Any]:
        """Optimize threat classification models"""
        
        def objective(trial):
            # Suggest model type
            model_type = trial.suggest_categorical(
                'model_type',
                ['random_forest', 'gradient_boosting', 'neural_network']
            )
            
            if model_type == 'random_forest':
                return self._optimize_random_forest(trial, X_train, y_train, X_val, y_val)
            elif model_type == 'gradient_boosting':
                return self._optimize_gradient_boosting(trial, X_train, y_train, X_val, y_val)
            else:
                return self._optimize_neural_network(trial, X_train, y_train, X_val, y_val)
        
        # Create new study for classification
        classification_study = optuna.create_study(
            study_name=f"{self.study_name}_classification",
            storage=self.storage_url,
            direction="maximize",
            sampler=TPESampler(seed=42),
            load_if_exists=True
        )
        
        classification_study.optimize(objective, n_trials=n_trials)
        
        return {
            'best_params': classification_study.best_trial.params,
            'best_score': classification_study.best_trial.value,
            'study': classification_study
        }
    
    def _optimize_random_forest(self, trial, X_train, y_train, X_val, y_val) -> float:
        """Optimize Random Forest for threat classification"""
        
        n_estimators = trial.suggest_int('n_estimators', 50, 500)
        max_depth = trial.suggest_int('max_depth', 3, 20)
        min_samples_split = trial.suggest_int('min_samples_split', 2, 20)
        min_samples_leaf = trial.suggest_int('min_samples_leaf', 1, 10)
        max_features = trial.suggest_categorical('max_features', ['sqrt', 'log2', None])
        
        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            min_samples_leaf=min_samples_leaf,
            max_features=max_features,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_val)
        
        return f1_score(y_val, y_pred, average='weighted')
    
    def multi_objective_optimization(self, 
                                   X_train: np.ndarray, 
                                   y_train: np.ndarray,
                                   X_val: np.ndarray,
                                   y_val: np.ndarray,
                                   n_trials: int = 100) -> Dict[str, Any]:
        """Multi-objective optimization balancing accuracy and inference time"""
        
        def objective(trial):
            # Model selection and hyperparameters
            model_type = trial.suggest_categorical('model_type', ['isolation_forest', 'one_class_svm'])
            
            start_time = datetime.now()
            
            if model_type == 'isolation_forest':
                metrics = self._optimize_isolation_forest(trial, X_train, y_train, X_val, y_val)
            else:
                metrics = self._optimize_one_class_svm(trial, X_train, y_train, X_val, y_val)
            
            inference_time = (datetime.now() - start_time).total_seconds()
            
            # Return multiple objectives: maximize F1, minimize inference time
            return metrics['f1_score'], -inference_time  # Negative time for minimization
        
        # Create multi-objective study
        multi_study = optuna.create_study(
            study_name=f"{self.study_name}_multi_objective",
            storage=self.storage_url,
            directions=["maximize", "maximize"],  # Both objectives to maximize
            sampler=TPESampler(seed=42),
            load_if_exists=True
        )
        
        multi_study.optimize(objective, n_trials=n_trials)
        
        # Get Pareto front
        pareto_front = []
        for trial in multi_study.best_trials:
            pareto_front.append({
                'params': trial.params,
                'f1_score': trial.values[0],
                'inference_time': -trial.values[1],  # Convert back to positive
                'trial_number': trial.number
            })
        
        return {
            'pareto_front': pareto_front,
            'study': multi_study,
            'n_trials': len(multi_study.trials)
        }
    
    def get_optimization_insights(self) -> Dict[str, Any]:
        """Get insights from optimization results"""
        
        if len(self.study.trials) == 0:
            return {"message": "No trials completed yet"}
        
        # Parameter importance
        importance = optuna.importance.get_param_importances(self.study)
        
        # Optimization history
        trials_df = self.study.trials_dataframe()
        
        # Best trial analysis
        best_trial = self.study.best_trial
        
        insights = {
            'parameter_importance': importance,
            'best_trial': {
                'number': best_trial.number,
                'value': best_trial.value,
                'params': best_trial.params,
                'user_attrs': best_trial.user_attrs
            },
            'optimization_history': {
                'n_trials': len(self.study.trials),
                'best_values': [trial.value for trial in self.study.trials if trial.value is not None],
                'convergence': self._analyze_convergence()
            },
            'trials_summary': trials_df.describe().to_dict() if not trials_df.empty else {}
        }
        
        return insights
    
    def _analyze_convergence(self) -> Dict[str, Any]:
        """Analyze optimization convergence"""
        
        values = [trial.value for trial in self.study.trials if trial.value is not None]
        
        if len(values) < 10:
            return {"status": "insufficient_data"}
        
        # Calculate improvement rate
        best_so_far = []
        current_best = float('-inf')
        
        for value in values:
            if value > current_best:
                current_best = value
            best_so_far.append(current_best)
        
        # Check if improvement has plateaued
        recent_improvements = np.diff(best_so_far[-20:])  # Last 20 trials
        avg_recent_improvement = np.mean(recent_improvements)
        
        convergence_status = "converged" if avg_recent_improvement < 0.001 else "improving"
        
        return {
            "status": convergence_status,
            "best_so_far": best_so_far,
            "recent_improvement_rate": avg_recent_improvement,
            "total_improvement": best_so_far[-1] - best_so_far[0] if best_so_far else 0
        }
    
    def save_best_model(self, 
                       X_train: np.ndarray, 
                       y_train: np.ndarray,
                       model_name: str = "optimized_model") -> str:
        """Train and save the best model found during optimization"""
        
        if not self.study.best_trial:
            raise ValueError("No optimization trials completed")
        
        best_params = self.study.best_trial.params
        model_type = best_params.get('model_type', 'isolation_forest')
        
        # Create model with best parameters
        if model_type == 'isolation_forest':
            model = IsolationForest(
                n_estimators=best_params.get('n_estimators', 100),
                contamination=best_params.get('contamination', 0.1),
                max_features=best_params.get('max_features', 1.0),
                max_samples=best_params.get('max_samples', 'auto'),
                random_state=42
            )
        elif model_type == 'one_class_svm':
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            
            model = OneClassSVM(
                kernel=best_params.get('kernel', 'rbf'),
                gamma=best_params.get('gamma', 'scale'),
                nu=best_params.get('nu', 0.1)
            )
            
            # Save scaler along with model
            scaler_path = f"{model_name}_scaler.joblib"
            joblib.dump(scaler, scaler_path)
            
            X_train = X_train_scaled
        
        # Train final model
        model.fit(X_train)
        
        # Save model
        model_path = f"{model_name}.joblib"
        joblib.dump(model, model_path)
        
        logger.info(
            "Best model saved",
            model_path=model_path,
            model_type=model_type,
            best_score=self.study.best_trial.value
        )
        
        return model_path
```

### Automated Model Selection Pipeline

**File**: `ml/automated_model_selection.py`

```python
import optuna
from optuna.integration import MLflowCallback
import mlflow
import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.pipeline import Pipeline
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.svm import OneClassSVM, SVC
from sklearn.neural_network import MLPClassifier
from typing import Dict, List, Any, Tuple
import structlog
from datetime import datetime

logger = structlog.get_logger()

class AutomatedModelSelector:
    """Automated model selection and pipeline optimization for SecureNet"""
    
    def __init__(self, task_type: str = "anomaly_detection"):
        self.task_type = task_type
        self.study = None
        self.best_pipeline = None
        
    def optimize_full_pipeline(self, 
                             X: np.ndarray, 
                             y: np.ndarray,
                             cv_folds: int = 5,
                             n_trials: int = 200,
                             timeout: int = 7200) -> Dict[str, Any]:
        """
        Optimize entire ML pipeline including preprocessing, feature selection, and model
        
        Args:
            X: Feature matrix
            y: Target vector
            cv_folds: Number of cross-validation folds
            n_trials: Number of optimization trials
            timeout: Timeout in seconds (2 hours default)
            
        Returns:
            Optimization results and best pipeline
        """
        
        def objective(trial):
            # 1. Preprocessing optimization
            scaler_type = trial.suggest_categorical(
                'scaler', ['standard', 'robust', 'minmax', 'none']
            )
            
            # 2. Feature selection optimization
            feature_selection = trial.suggest_categorical(
                'feature_selection', ['none', 'k_best', 'percentile']
            )
            
            if feature_selection == 'k_best':
                k_features = trial.suggest_int('k_features', 5, min(50, X.shape[1]))
            elif feature_selection == 'percentile':
                percentile = trial.suggest_int('percentile', 10, 90)
            
            # 3. Model optimization
            if self.task_type == "anomaly_detection":
                score = self._optimize_anomaly_pipeline(
                    trial, X, y, scaler_type, feature_selection, cv_folds
                )
            else:  # classification
                score = self._optimize_classification_pipeline(
                    trial, X, y, scaler_type, feature_selection, cv_folds
                )
            
            return score
        
        # Create study
        study_name = f"securenet_{self.task_type}_pipeline"
        self.study = optuna.create_study(
            study_name=study_name,
            direction="maximize",
            sampler=optuna.samplers.TPESampler(seed=42),
            pruner=optuna.pruners.MedianPruner(n_startup_trials=10)
        )
        
        # Run optimization
        self.study.optimize(objective, n_trials=n_trials, timeout=timeout)
        
        # Build best pipeline
        self.best_pipeline = self._build_best_pipeline(X, y)
        
        return {
            'best_params': self.study.best_trial.params,
            'best_score': self.study.best_trial.value,
            'best_pipeline': self.best_pipeline,
            'study': self.study
        }
    
    def _optimize_anomaly_pipeline(self, 
                                 trial, 
                                 X: np.ndarray, 
                                 y: np.ndarray,
                                 scaler_type: str,
                                 feature_selection: str,
                                 cv_folds: int) -> float:
        """Optimize anomaly detection pipeline"""
        
        # Model selection
        model_type = trial.suggest_categorical(
            'model_type', ['isolation_forest', 'one_class_svm', 'local_outlier_factor']
        )
        
        # Build pipeline components
        pipeline_steps = []
        
        # Add scaler
        if scaler_type != 'none':
            if scaler_type == 'standard':
                pipeline_steps.append(('scaler', StandardScaler()))
            elif scaler_type == 'robust':
                pipeline_steps.append(('scaler', RobustScaler()))
            elif scaler_type == 'minmax':
                pipeline_steps.append(('scaler', MinMaxScaler()))
        
        # Add feature selection
        if feature_selection == 'k_best':
            k_features = trial.params['k_features']
            pipeline_steps.append(('feature_selection', SelectKBest(f_classif, k=k_features)))
        elif feature_selection == 'percentile':
            percentile = trial.params['percentile']
            from sklearn.feature_selection import SelectPercentile
            pipeline_steps.append(('feature_selection', SelectPercentile(f_classif, percentile=percentile)))
        
        # Add model
        if model_type == 'isolation_forest':
            n_estimators = trial.suggest_int('n_estimators', 50, 300)
            contamination = trial.suggest_float('contamination', 0.01, 0.3)
            max_features = trial.suggest_float('max_features', 0.1, 1.0)
            
            model = IsolationForest(
                n_estimators=n_estimators,
                contamination=contamination,
                max_features=max_features,
                random_state=42,
                n_jobs=-1
            )
        
        elif model_type == 'one_class_svm':
            kernel = trial.suggest_categorical('kernel', ['rbf', 'poly', 'sigmoid'])
            gamma = trial.suggest_categorical('gamma', ['scale', 'auto'])
            nu = trial.suggest_float('nu', 0.01, 0.5)
            
            model = OneClassSVM(kernel=kernel, gamma=gamma, nu=nu)
        
        pipeline_steps.append(('model', model))
        
        # Create pipeline
        pipeline = Pipeline(pipeline_steps)
        
        # Cross-validation for anomaly detection
        scores = []
        cv = TimeSeriesSplit(n_splits=cv_folds) if self._is_time_series(X) else cv_folds
        
        for train_idx, val_idx in cv.split(X) if hasattr(cv, 'split') else [(range(len(X)), range(len(X)))]:
            X_train, X_val = X[train_idx], X[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            # Fit on training data
            pipeline.fit(X_train)
            
            # Predict on validation data
            y_pred = pipeline.predict(X_val)
            
            # Calculate F1 score
            from sklearn.metrics import f1_score
            score = f1_score(y_val, y_pred, average='binary', pos_label=-1)
            scores.append(score)
        
        return np.mean(scores)
    
    def _optimize_classification_pipeline(self, 
                                        trial, 
                                        X: np.ndarray, 
                                        y: np.ndarray,
                                        scaler_type: str,
                                        feature_selection: str,
                                        cv_folds: int) -> float:
        """Optimize classification pipeline"""
        
        # Model selection
        model_type = trial.suggest_categorical(
            'model_type', ['random_forest', 'svm', 'neural_network']
        )
        
        # Build pipeline components
        pipeline_steps = []
        
        # Add scaler
        if scaler_type != 'none':
            if scaler_type == 'standard':
                pipeline_steps.append(('scaler', StandardScaler()))
            elif scaler_type == 'robust':
                pipeline_steps.append(('scaler', RobustScaler()))
            elif scaler_type == 'minmax':
                pipeline_steps.append(('scaler', MinMaxScaler()))
        
        # Add feature selection
        if feature_selection == 'k_best':
            k_features = trial.params['k_features']
            pipeline_steps.append(('feature_selection', SelectKBest(f_classif, k=k_features)))
        elif feature_selection == 'percentile':
            percentile = trial.params['percentile']
            from sklearn.feature_selection import SelectPercentile
            pipeline_steps.append(('feature_selection', SelectPercentile(f_classif, percentile=percentile)))
        
        # Add model
        if model_type == 'random_forest':
            n_estimators = trial.suggest_int('n_estimators', 50, 500)
            max_depth = trial.suggest_int('max_depth', 3, 20)
            min_samples_split = trial.suggest_int('min_samples_split', 2, 20)
            
            model = RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
                n_jobs=-1
            )
        
        elif model_type == 'svm':
            C = trial.suggest_float('C', 1e-3, 1e3, log=True)
            kernel = trial.suggest_categorical('kernel', ['rbf', 'poly', 'linear'])
            gamma = trial.suggest_categorical('gamma', ['scale', 'auto'])
            
            model = SVC(C=C, kernel=kernel, gamma=gamma, random_state=42)
        
        elif model_type == 'neural_network':
            hidden_layer_sizes = []
            n_layers = trial.suggest_int('n_layers', 1, 3)
            
            for i in range(n_layers):
                size = trial.suggest_int(f'layer_{i}_size', 50, 300)
                hidden_layer_sizes.append(size)
            
            learning_rate = trial.suggest_float('learning_rate', 1e-5, 1e-1, log=True)
            alpha = trial.suggest_float('alpha', 1e-6, 1e-2, log=True)
            
            model = MLPClassifier(
                hidden_layer_sizes=tuple(hidden_layer_sizes),
                learning_rate_init=learning_rate,
                alpha=alpha,
                max_iter=500,
                random_state=42
            )
        
        pipeline_steps.append(('model', model))
        
        # Create pipeline
        pipeline = Pipeline(pipeline_steps)
        
        # Cross-validation
        scores = cross_val_score(pipeline, X, y, cv=cv_folds, scoring='f1_weighted', n_jobs=-1)
        
        return np.mean(scores)
    
    def _build_best_pipeline(self, X: np.ndarray, y: np.ndarray) -> Pipeline:
        """Build the best pipeline from optimization results"""
        
        if not self.study.best_trial:
            raise ValueError("No optimization completed")
        
        best_params = self.study.best_trial.params
        
        # Build pipeline with best parameters
        pipeline_steps = []
        
        # Add scaler
        scaler_type = best_params.get('scaler', 'none')
        if scaler_type != 'none':
            if scaler_type == 'standard':
                pipeline_steps.append(('scaler', StandardScaler()))
            elif scaler_type == 'robust':
                pipeline_steps.append(('scaler', RobustScaler()))
            elif scaler_type == 'minmax':
                pipeline_steps.append(('scaler', MinMaxScaler()))
        
        # Add feature selection
        feature_selection = best_params.get('feature_selection', 'none')
        if feature_selection == 'k_best':
            k_features = best_params['k_features']
            pipeline_steps.append(('feature_selection', SelectKBest(f_classif, k=k_features)))
        elif feature_selection == 'percentile':
            percentile = best_params['percentile']
            from sklearn.feature_selection import SelectPercentile
            pipeline_steps.append(('feature_selection', SelectPercentile(f_classif, percentile=percentile)))
        
        # Add best model
        model_type = best_params['model_type']
        
        if self.task_type == "anomaly_detection":
            if model_type == 'isolation_forest':
                model = IsolationForest(
                    n_estimators=best_params.get('n_estimators', 100),
                    contamination=best_params.get('contamination', 0.1),
                    max_features=best_params.get('max_features', 1.0),
                    random_state=42
                )
            elif model_type == 'one_class_svm':
                model = OneClassSVM(
                    kernel=best_params.get('kernel', 'rbf'),
                    gamma=best_params.get('gamma', 'scale'),
                    nu=best_params.get('nu', 0.1)
                )
        else:  # classification
            if model_type == 'random_forest':
                model = RandomForestClassifier(
                    n_estimators=best_params.get('n_estimators', 100),
                    max_depth=best_params.get('max_depth', 10),
                    min_samples_split=best_params.get('min_samples_split', 2),
                    random_state=42
                )
            # Add other model types as needed
        
        pipeline_steps.append(('model', model))
        
        # Create and fit pipeline
        pipeline = Pipeline(pipeline_steps)
        pipeline.fit(X, y)
        
        return pipeline
    
    def _is_time_series(self, X: np.ndarray) -> bool:
        """Check if data appears to be time series"""
        # Simple heuristic - could be improved
        return X.shape[0] > 100 and X.shape[1] < 20
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from the best model"""
        
        if not self.best_pipeline:
            raise ValueError("No pipeline trained yet")
        
        model = self.best_pipeline.named_steps['model']
        
        if hasattr(model, 'feature_importances_'):
            # Tree-based models
            importances = model.feature_importances_
        elif hasattr(model, 'coef_'):
            # Linear models
            importances = np.abs(model.coef_).flatten()
        else:
            return {"message": "Feature importance not available for this model type"}
        
        # Get feature names after preprocessing
        feature_names = [f"feature_{i}" for i in range(len(importances))]
        
        return dict(zip(feature_names, importances))
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report"""
        
        if not self.study:
            return {"error": "No optimization study available"}
        
        # Basic statistics
        n_trials = len(self.study.trials)
        best_value = self.study.best_value
        best_params = self.study.best_params
        
        # Parameter importance
        importance = optuna.importance.get_param_importances(self.study)
        
        # Convergence analysis
        trial_values = [trial.value for trial in self.study.trials if trial.value is not None]
        
        report = {
            'optimization_summary': {
                'n_trials': n_trials,
                'best_score': best_value,
                'best_parameters': best_params,
                'task_type': self.task_type
            },
            'parameter_importance': importance,
            'convergence': {
                'trial_values': trial_values,
                'improvement_over_time': np.maximum.accumulate(trial_values) if trial_values else [],
                'final_improvement': trial_values[-1] - trial_values[0] if len(trial_values) > 1 else 0
            },
            'model_comparison': self._analyze_model_performance(),
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _analyze_model_performance(self) -> Dict[str, Any]:
        """Analyze performance of different model types"""
        
        model_performance = {}
        
        for trial in self.study.trials:
            if trial.value is None:
                continue
                
            model_type = trial.params.get('model_type', 'unknown')
            
            if model_type not in model_performance:
                model_performance[model_type] = []
            
            model_performance[model_type].append(trial.value)
        
        # Calculate statistics for each model type
        model_stats = {}
        for model_type, scores in model_performance.items():
            model_stats[model_type] = {
                'mean_score': np.mean(scores),
                'std_score': np.std(scores),
                'best_score': np.max(scores),
                'n_trials': len(scores)
            }
        
        return model_stats
    
    def _generate_recommendations(self) -> List[str]:
        """Generate optimization recommendations"""
        
        recommendations = []
        
        if len(self.study.trials) < 50:
            recommendations.append("Consider running more trials for better optimization")
        
        # Check parameter importance
        importance = optuna.importance.get_param_importances(self.study)
        
        if importance:
            most_important = max(importance.items(), key=lambda x: x[1])
            recommendations.append(f"Focus on tuning '{most_important[0]}' - highest parameter importance")
        
        # Check convergence
        trial_values = [trial.value for trial in self.study.trials if trial.value is not None]
        if len(trial_values) > 20:
            recent_improvement = np.mean(trial_values[-10:]) - np.mean(trial_values[-20:-10])
            if recent_improvement < 0.001:
                recommendations.append("Optimization appears to have converged")
            else:
                recommendations.append("Optimization still improving - consider more trials")
        
        return recommendations
```

## 🚀 Usage Examples

### Basic Hyperparameter Optimization

```python
from ml.hyperparameter_optimization import SecureNetOptimizer
import numpy as np

# Create optimizer
optimizer = SecureNetOptimizer(study_name="threat_detection_optimization")

# Prepare data
X_train = np.random.randn(1000, 20)
y_train = np.random.choice([-1, 1], 1000)  # Anomaly labels
X_val = np.random.randn(200, 20)
y_val = np.random.choice([-1, 1], 200)

# Run optimization
results = optimizer.optimize_anomaly_detection(
    X_train, y_train, X_val, y_val,
    n_trials=100,
    timeout=3600
)

print(f"Best F1 score: {results['best_score']:.4f}")
print(f"Best parameters: {results['best_params']}")

# Save best model
model_path = optimizer.save_best_model(X_train, y_train)
print(f"Best model saved to: {model_path}")
```

### Automated Pipeline Optimization

```python
from ml.automated_model_selection import AutomatedModelSelector

# Create selector
selector = AutomatedModelSelector(task_type="anomaly_detection")

# Optimize full pipeline
results = selector.optimize_full_pipeline(
    X_train, y_train,
    cv_folds=5,
    n_trials=200,
    timeout=7200  # 2 hours
)

# Get best pipeline
best_pipeline = results['best_pipeline']

# Make predictions
predictions = best_pipeline.predict(X_test)

# Generate report
report = selector.generate_optimization_report()
print(report['optimization_summary'])
```

### Multi-objective Optimization

```python
# Balance accuracy and inference speed
multi_results = optimizer.multi_objective_optimization(
    X_train, y_train, X_val, y_val,
    n_trials=150
)

# Analyze Pareto front
for solution in multi_results['pareto_front']:
    print(f"F1: {solution['f1_score']:.4f}, "
          f"Time: {solution['inference_time']:.3f}s, "
          f"Params: {solution['params']}")
```

### Command Line Usage

```bash
# Run optimization with Optuna CLI
optuna create-study --study-name securenet_optimization --storage sqlite:///optuna.db

# Start optimization dashboard
optuna-dashboard sqlite:///optuna.db --host 0.0.0.0 --port 8080
```

## ✅ Validation Steps

1. **Install Optuna**:
   ```bash
   pip install optuna optuna-dashboard
   ```

2. **Test Basic Optimization**:
   ```python
   import optuna
   
   def objective(trial):
       x = trial.suggest_float('x', -10, 10)
       return (x - 2) ** 2
   
   study = optuna.create_study()
   study.optimize(objective, n_trials=100)
   print(f"Best value: {study.best_value}")
   ```

3. **Start Dashboard**:
   ```bash
   optuna-dashboard sqlite:///optuna_studies.db
   # Open http://localhost:8080
   ```

4. **Test SecureNet Integration**:
   ```python
   from ml.hyperparameter_optimization import SecureNetOptimizer
   optimizer = SecureNetOptimizer()
   # Run with sample data
   ```

## 📈 Benefits for SecureNet

- **Automated Optimization** - No manual hyperparameter tuning required
- **Better Model Performance** - Find optimal configurations automatically
- **Multi-objective Optimization** - Balance accuracy, speed, and resource usage
- **Efficient Search** - Advanced algorithms find good solutions quickly
- **Reproducible Results** - All experiments tracked and reproducible
- **Scalable** - Distribute optimization across multiple machines

## 🔗 Related Documentation

- [Phase 3: Advanced Tooling](../integration/phase-3-advanced-tooling.md)
- [ML Tools Overview](README.md)
- [MLflow Integration](mlflow.md)
- [wandb Integration](wandb.md) 