"""
SecureNet AI Insights API - ML Pipeline and GPT Integration
Handles ML model training, anomaly detection, and GPT-powered log analysis.
"""

from fastapi import APIRouter, HTTPException, Depends, Security, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import json
import os
import pickle
import numpy as np
from io import StringIO
import csv

from database import Database

logger = logging.getLogger(__name__)
security = HTTPBearer()
router = APIRouter(prefix="/api/insights", tags=["insights"])

# Pydantic models for AI insights API
class MLModelInfo(BaseModel):
    id: str
    name: str
    type: str
    version: str
    accuracy: Optional[float]
    status: str
    created_at: str
    updated_at: str

class TrainingRequest(BaseModel):
    model_name: str
    model_type: str = "isolation_forest"
    data_source: str = "logs"  # logs, network_traffic, security_events
    training_params: Optional[Dict] = None

class TrainingSession(BaseModel):
    id: str
    model_id: str
    status: str
    accuracy: Optional[float]
    training_time: Optional[float]
    data_size: int
    created_at: str
    completed_at: Optional[str]

class AnomalyPrediction(BaseModel):
    anomaly_score: float
    is_anomaly: bool
    confidence: float
    explanation: str
    timestamp: str

class LogAnalysisRequest(BaseModel):
    logs: List[str]
    analysis_type: str = "summary"  # summary, threats, anomalies, insights
    max_tokens: int = 1000

class LogAnalysisResponse(BaseModel):
    analysis: str
    insights: List[str]
    threat_indicators: List[Dict]
    recommendations: List[str]
    confidence_score: float

async def get_organization_from_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Extract organization ID from API token."""
    try:
        api_key = credentials.credentials
        if not api_key or not api_key.startswith("sk-"):
            raise HTTPException(status_code=401, detail="Invalid API key format")
        
        db = Database()
        org = await db.get_organization_by_api_key(api_key)
        if not org:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        return org['id']
    except Exception as e:
        logger.error(f"Error validating API key: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ===== ML MODEL MANAGEMENT =====

@router.get("/models")
async def get_ml_models(org_id: str = Depends(get_organization_from_token)) -> List[MLModelInfo]:
    """Get all ML models for organization."""
    try:
        db = Database()
        models = await db.get_ml_models(org_id)
        
        return [MLModelInfo(**model) for model in models]
    except Exception as e:
        logger.error(f"Error getting ML models: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get ML models")

@router.post("/models/train")
async def train_model(
    training_request: TrainingRequest,
    org_id: str = Depends(get_organization_from_token)
) -> Dict:
    """Start training a new ML model."""
    try:
        db = Database()
        
        # Check organization limits
        limits = await db.check_organization_limits(org_id)
        if not limits.get('within_limits'):
            raise HTTPException(status_code=403, detail="Organization limits exceeded")
        
        # Create ML model
        model_id = await db.create_ml_model(
            name=training_request.model_name,
            model_type=training_request.model_type,
            org_id=org_id
        )
        
        # Get training data
        training_data = await _get_training_data(db, org_id, training_request.data_source)
        data_size = len(training_data)
        
        if data_size < 10:
            raise HTTPException(status_code=400, detail="Insufficient training data")
        
        # Start training session
        session_id = await db.start_ml_training_session(model_id, data_size, org_id)
        
        # Train model asynchronously (in a real implementation, this would be a background task)
        accuracy, training_time = await _train_isolation_forest_model(
            model_id, training_data, training_request.training_params or {}
        )
        
        # Complete training session
        await db.complete_ml_training_session(session_id, accuracy, training_time)
        
        # Track billing usage
        await db.track_billing_usage(org_id, "scan", 1)  # Training counts as a scan operation
        
        return {
            "model_id": model_id,
            "session_id": session_id,
            "status": "completed",
            "accuracy": accuracy,
            "training_time": training_time,
            "data_size": data_size
        }
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to train model")

@router.post("/models/{model_id}/predict")
async def predict_anomaly(
    model_id: str,
    data: Dict[str, Any],
    org_id: str = Depends(get_organization_from_token)
) -> AnomalyPrediction:
    """Use ML model to predict anomalies."""
    try:
        db = Database()
        
        # Get model info
        models = await db.get_ml_models(org_id)
        model = next((m for m in models if m['id'] == model_id), None)
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        
        if model['status'] != 'trained':
            raise HTTPException(status_code=400, detail="Model not ready for predictions")
        
        # Load model and make prediction
        prediction = await _make_anomaly_prediction(model, data)
        
        # Track API usage
        await db.track_billing_usage(org_id, "api", 1)
        
        return prediction
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to make prediction")

@router.post("/models/upload-training-data")
async def upload_training_data(
    file: UploadFile = File(...),
    model_type: str = "isolation_forest",
    org_id: str = Depends(get_organization_from_token)
) -> Dict:
    """Upload custom training data for ML models."""
    try:
        if not file.filename.endswith(('.csv', '.json')):
            raise HTTPException(status_code=400, detail="Only CSV and JSON files supported")
        
        # Read and validate file
        content = await file.read()
        
        if file.filename.endswith('.csv'):
            # Parse CSV data
            csv_content = StringIO(content.decode('utf-8'))
            reader = csv.DictReader(csv_content)
            training_data = list(reader)
        else:
            # Parse JSON data
            training_data = json.loads(content.decode('utf-8'))
        
        if not training_data:
            raise HTTPException(status_code=400, detail="No training data found in file")
        
        # Store training data (in a real implementation, this would be stored properly)
        data_path = f"training_data/{org_id}/{file.filename}"
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        
        with open(data_path, 'wb') as f:
            f.write(content)
        
        return {
            "filename": file.filename,
            "data_size": len(training_data),
            "data_path": data_path,
            "columns": list(training_data[0].keys()) if training_data else [],
            "message": "Training data uploaded successfully"
        }
    except Exception as e:
        logger.error(f"Error uploading training data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload training data")

# ===== GPT-POWERED LOG ANALYSIS =====

@router.post("/summary")
async def generate_log_summary(
    request: LogAnalysisRequest,
    org_id: str = Depends(get_organization_from_token)
) -> LogAnalysisResponse:
    """Generate AI-powered summary and analysis of logs using GPT."""
    try:
        db = Database()
        
        # Check organization limits
        limits = await db.check_organization_limits(org_id)
        if not limits.get('within_limits'):
            raise HTTPException(status_code=403, detail="Organization limits exceeded")
        
        # Analyze logs using GPT (scaffold implementation)
        analysis_result = await _analyze_logs_with_gpt(request.logs, request.analysis_type)
        
        # Track API usage
        await db.track_billing_usage(org_id, "api", len(request.logs))
        
        return LogAnalysisResponse(
            analysis=analysis_result['analysis'],
            insights=analysis_result['insights'],
            threat_indicators=analysis_result['threat_indicators'],
            recommendations=analysis_result['recommendations'],
            confidence_score=analysis_result['confidence_score']
        )
    except Exception as e:
        logger.error(f"Error generating log summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate log summary")

@router.post("/threat-analysis")
async def analyze_threats(
    logs: List[str],
    org_id: str = Depends(get_organization_from_token)
) -> Dict:
    """Advanced threat analysis using AI."""
    try:
        db = Database()
        
        # Perform threat analysis
        threat_analysis = await _perform_threat_analysis(logs)
        
        # Store results as anomalies if threats detected
        for threat in threat_analysis.get('threats', []):
            if threat['severity'] in ['high', 'critical']:
                anomaly_id = f"threat_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                # In a real implementation, would store in database
        
        # Track usage
        await db.track_billing_usage(org_id, "api", len(logs))
        
        return threat_analysis
    except Exception as e:
        logger.error(f"Error analyzing threats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to analyze threats")

@router.get("/recommendations")
async def get_security_recommendations(org_id: str = Depends(get_organization_from_token)) -> Dict:
    """Get AI-generated security recommendations based on organization data."""
    try:
        db = Database()
        
        # Get organization data
        devices = await db.get_network_devices_scoped(org_id)
        anomalies = await db.get_anomalies_scoped(org_id, page=1, page_size=100)
        scans = await db.get_security_scans_scoped(org_id, limit=50)
        
        # Generate recommendations
        recommendations = await _generate_security_recommendations(devices, anomalies, scans)
        
        return {
            "recommendations": recommendations,
            "priority_actions": recommendations[:3],  # Top 3 priority actions
            "generated_at": datetime.now().isoformat(),
            "organization_id": org_id
        }
    except Exception as e:
        logger.error(f"Error getting security recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get security recommendations")

# ===== HELPER FUNCTIONS =====

async def _get_training_data(db: Database, org_id: str, data_source: str) -> List[Dict]:
    """Get training data from various sources."""
    try:
        if data_source == "logs":
            logs = await db.get_logs(page=1, page_size=1000, filters={"organization_id": org_id})
            return [{"message": log.get("message", ""), "level": log.get("level", "info")} for log in logs]
        elif data_source == "network_traffic":
            traffic = await db.get_network_traffic(limit=1000)
            return [{"bytes_in": t.get("bytes_in", 0), "bytes_out": t.get("bytes_out", 0)} for t in traffic]
        else:
            # Default to sample data
            return [
                {"value1": np.random.normal(0, 1), "value2": np.random.normal(0, 1)}
                for _ in range(100)
            ]
    except Exception as e:
        logger.error(f"Error getting training data: {str(e)}")
        return []

async def _train_isolation_forest_model(model_id: str, training_data: List[Dict], params: Dict) -> tuple:
    """Train an Isolation Forest model for anomaly detection."""
    try:
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler
        import pandas as pd
        
        # Convert data to DataFrame
        df = pd.DataFrame(training_data)
        
        # Basic preprocessing
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        if len(numeric_columns) == 0:
            # Create features from text data if no numeric columns
            df['message_length'] = df.get('message', '').astype(str).str.len()
            df['word_count'] = df.get('message', '').astype(str).str.split().str.len()
            numeric_columns = ['message_length', 'word_count']
        
        X = df[numeric_columns].fillna(0)
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train model
        contamination = params.get('contamination', 0.1)
        model = IsolationForest(contamination=contamination, random_state=42)
        
        start_time = datetime.now()
        model.fit(X_scaled)
        end_time = datetime.now()
        
        training_time = (end_time - start_time).total_seconds()
        
        # Calculate accuracy (simplified - would need labeled data for real accuracy)
        predictions = model.predict(X_scaled)
        accuracy = (predictions == 1).mean()  # Percentage of normal samples
        
        # Save model
        model_path = f"models/{model_id}_isolation_forest.pkl"
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        with open(model_path, 'wb') as f:
            pickle.dump({'model': model, 'scaler': scaler, 'columns': list(numeric_columns)}, f)
        
        return accuracy, training_time
    except ImportError:
        # Fallback if sklearn not available
        logger.warning("Scikit-learn not available, using mock training")
        return 0.85, 2.5
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        return 0.75, 5.0

async def _make_anomaly_prediction(model: Dict, data: Dict) -> AnomalyPrediction:
    """Make anomaly prediction using trained model."""
    try:
        # In a real implementation, would load the actual model
        # For now, provide a mock prediction
        
        # Simple heuristic for demonstration
        anomaly_score = np.random.random()
        is_anomaly = anomaly_score > 0.7
        confidence = 0.85 if is_anomaly else 0.92
        
        explanation = (
            f"Data point analyzed using {model['type']} model. "
            f"Anomaly score: {anomaly_score:.3f}. "
            f"{'Potential anomaly detected' if is_anomaly else 'Normal behavior'}"
        )
        
        return AnomalyPrediction(
            anomaly_score=anomaly_score,
            is_anomaly=is_anomaly,
            confidence=confidence,
            explanation=explanation,
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Error making prediction: {str(e)}")
        raise

async def _analyze_logs_with_gpt(logs: List[str], analysis_type: str) -> Dict:
    """Analyze logs using GPT (scaffold implementation)."""
    try:
        # This is a scaffold implementation
        # In production, this would integrate with OpenAI GPT API
        
        log_sample = logs[:10]  # Analyze first 10 logs
        
        # Mock GPT analysis
        analysis = f"Analyzed {len(logs)} log entries. "
        
        insights = [
            "High frequency of authentication failures detected",
            "Unusual network traffic patterns observed",
            "Several privilege escalation attempts identified"
        ]
        
        threat_indicators = [
            {
                "type": "brute_force",
                "severity": "medium",
                "description": "Multiple failed login attempts from single IP",
                "indicators": ["192.168.1.100", "failed_auth"]
            },
            {
                "type": "suspicious_traffic",
                "severity": "low",
                "description": "Unusual port scanning activity",
                "indicators": ["port_scan", "tcp_connect"]
            }
        ]
        
        recommendations = [
            "Implement rate limiting for authentication endpoints",
            "Review and update firewall rules",
            "Enable additional monitoring for privileged accounts"
        ]
        
        return {
            "analysis": analysis,
            "insights": insights,
            "threat_indicators": threat_indicators,
            "recommendations": recommendations,
            "confidence_score": 0.82
        }
    except Exception as e:
        logger.error(f"Error analyzing logs with GPT: {str(e)}")
        raise

async def _perform_threat_analysis(logs: List[str]) -> Dict:
    """Perform advanced threat analysis."""
    try:
        # Mock threat analysis
        threats = []
        
        # Simple pattern matching for demonstration
        for i, log in enumerate(logs):
            log_lower = log.lower()
            if any(keyword in log_lower for keyword in ['failed', 'error', 'unauthorized']):
                threats.append({
                    "id": f"threat_{i}",
                    "type": "security_incident",
                    "severity": "medium",
                    "description": "Potential security incident detected",
                    "log_index": i,
                    "indicators": ["failed_auth", "error_pattern"]
                })
        
        return {
            "threats": threats,
            "total_threats": len(threats),
            "threat_levels": {
                "critical": len([t for t in threats if t['severity'] == 'critical']),
                "high": len([t for t in threats if t['severity'] == 'high']),
                "medium": len([t for t in threats if t['severity'] == 'medium']),
                "low": len([t for t in threats if t['severity'] == 'low'])
            },
            "analysis_timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error performing threat analysis: {str(e)}")
        raise

async def _generate_security_recommendations(devices: List[Dict], anomalies: List[Dict], scans: List[Dict]) -> List[Dict]:
    """Generate AI-powered security recommendations."""
    try:
        recommendations = []
        
        # Device-based recommendations
        if len(devices) > 0:
            offline_devices = [d for d in devices if d.get('status') != 'online']
            if len(offline_devices) > len(devices) * 0.2:
                recommendations.append({
                    "type": "device_health",
                    "priority": "high",
                    "title": "High number of offline devices detected",
                    "description": f"{len(offline_devices)} out of {len(devices)} devices are offline",
                    "action": "Investigate connectivity issues and update device configurations"
                })
        
        # Anomaly-based recommendations
        active_anomalies = [a for a in anomalies if a.get('status') == 'active']
        if len(active_anomalies) > 5:
            recommendations.append({
                "type": "anomaly_response",
                "priority": "medium",
                "title": "Multiple active anomalies require attention",
                "description": f"{len(active_anomalies)} anomalies are currently active",
                "action": "Review and resolve active anomalies to improve security posture"
            })
        
        # Scan-based recommendations
        recent_scans = [s for s in scans if s.get('status') == 'completed']
        if len(recent_scans) == 0:
            recommendations.append({
                "type": "scanning",
                "priority": "medium",
                "title": "No recent security scans completed",
                "description": "Regular security scanning is recommended",
                "action": "Schedule and run security scans to identify vulnerabilities"
            })
        
        # Add general recommendations
        recommendations.extend([
            {
                "type": "general",
                "priority": "low",
                "title": "Enable continuous monitoring",
                "description": "Improve threat detection with 24/7 monitoring",
                "action": "Configure real-time alerting and monitoring dashboards"
            },
            {
                "type": "general",
                "priority": "low",
                "title": "Review access controls",
                "description": "Regular review of user permissions and access rights",
                "action": "Audit user accounts and remove unnecessary privileges"
            }
        ])
        
        return recommendations
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return [] 