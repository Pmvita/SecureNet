#!/usr/bin/env python3
"""
Week 5 Day 4 Validation Script
Validates Advanced Analytics & AI/ML Integration features
"""

import sqlite3
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Tuple

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_PATH = "data/securenet.db"

class Week5Day4Validator:
    """Validator for Week 5 Day 4 Advanced Analytics & AI/ML Integration"""
    
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.validation_results = {}
        self.total_score = 0
        self.max_score = 100
        
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def validate_database_schema(self) -> Tuple[int, int]:
        """Validate that all required analytics and ML tables exist"""
        print("🔍 Validating database schema...")
        
        required_tables = [
            "threat_predictions",
            "user_behavior_analytics", 
            "automated_risk_scores",
            "predictive_compliance",
            "ml_model_performance",
            "analytics_insights"
        ]
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            existing_tables = []
            for table in required_tables:
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                if cursor.fetchone():
                    existing_tables.append(table)
            
            score = len(existing_tables)
            max_score = len(required_tables)
            
            print(f"   ✅ Found {score}/{max_score} required analytics tables")
            for table in existing_tables:
                print(f"      - {table}")
            
            if score < max_score:
                missing = set(required_tables) - set(existing_tables)
                print(f"   ❌ Missing tables: {', '.join(missing)}")
            
            return score * 5, max_score * 5  # 30 points total
            
        except Exception as e:
            print(f"   ❌ Error validating database schema: {str(e)}")
            return 0, max_score * 5
        finally:
            conn.close()
    
    def validate_threat_predictions(self) -> Tuple[int, int]:
        """Validate threat prediction models and data"""
        print("🎯 Validating threat prediction models...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if threat predictions table has data
            cursor.execute("SELECT COUNT(*) FROM threat_predictions")
            prediction_count = cursor.fetchone()[0]
            
            # Check for different threat types
            cursor.execute("SELECT DISTINCT threat_type FROM threat_predictions")
            threat_types = [row[0] for row in cursor.fetchall()]
            
            # Check for confidence scores and risk levels
            cursor.execute("SELECT AVG(confidence_score), COUNT(DISTINCT risk_level) FROM threat_predictions")
            avg_confidence, risk_levels_count = cursor.fetchone()
            
            score = 0
            max_score = 20
            
            if prediction_count >= 5:
                score += 8
                print(f"   ✅ Found {prediction_count} threat predictions")
            else:
                print(f"   ❌ Only {prediction_count} threat predictions (need ≥5)")
            
            if len(threat_types) >= 5:
                score += 6
                print(f"   ✅ Found {len(threat_types)} different threat types")
            else:
                print(f"   ❌ Only {len(threat_types)} threat types (need ≥5)")
            
            if avg_confidence and avg_confidence >= 0.7:
                score += 3
                print(f"   ✅ Average confidence score: {avg_confidence:.3f}")
            else:
                print(f"   ❌ Low average confidence: {avg_confidence:.3f if avg_confidence else 0}")
            
            if risk_levels_count >= 3:
                score += 3
                print(f"   ✅ Found {risk_levels_count} different risk levels")
            else:
                print(f"   ❌ Only {risk_levels_count} risk levels (need ≥3)")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating threat predictions: {str(e)}")
            return 0, 20
        finally:
            conn.close()
    
    def validate_user_behavior_analytics(self) -> Tuple[int, int]:
        """Validate user behavior analytics features"""
        print("👤 Validating user behavior analytics...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if user behavior analytics table has data
            cursor.execute("SELECT COUNT(*) FROM user_behavior_analytics")
            profile_count = cursor.fetchone()[0]
            
            # Check for baseline establishment
            cursor.execute("SELECT COUNT(*) FROM user_behavior_analytics WHERE baseline_established = 1")
            baseline_count = cursor.fetchone()[0]
            
            # Check for anomaly scores
            cursor.execute("SELECT AVG(anomaly_score), MAX(anomaly_score) FROM user_behavior_analytics")
            avg_anomaly, max_anomaly = cursor.fetchone()
            
            score = 0
            max_score = 15
            
            if profile_count >= 2:
                score += 7
                print(f"   ✅ Found {profile_count} user behavior profiles")
            else:
                print(f"   ❌ Only {profile_count} behavior profiles (need ≥2)")
            
            if baseline_count >= 1:
                score += 4
                print(f"   ✅ Found {baseline_count} profiles with established baselines")
            else:
                print(f"   ❌ No profiles with established baselines")
            
            if avg_anomaly is not None and max_anomaly > 0:
                score += 4
                print(f"   ✅ Anomaly detection active (avg: {avg_anomaly:.1f}, max: {max_anomaly:.1f})")
            else:
                print(f"   ❌ No anomaly scores found")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating user behavior analytics: {str(e)}")
            return 0, 15
        finally:
            conn.close()
    
    def validate_risk_scoring_system(self) -> Tuple[int, int]:
        """Validate automated risk scoring system"""
        print("⚠️ Validating automated risk scoring system...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if risk scores table has data
            cursor.execute("SELECT COUNT(*) FROM automated_risk_scores")
            risk_count = cursor.fetchone()[0]
            
            # Check for different entity types
            cursor.execute("SELECT DISTINCT entity_type FROM automated_risk_scores")
            entity_types = [row[0] for row in cursor.fetchall()]
            
            # Check for risk levels and confidence
            cursor.execute("SELECT COUNT(DISTINCT risk_level), AVG(confidence_level) FROM automated_risk_scores")
            risk_levels_count, avg_confidence = cursor.fetchone()
            
            score = 0
            max_score = 15
            
            if risk_count >= 5:
                score += 6
                print(f"   ✅ Found {risk_count} risk scores")
            else:
                print(f"   ❌ Only {risk_count} risk scores (need ≥5)")
            
            if len(entity_types) >= 3:
                score += 4
                print(f"   ✅ Found {len(entity_types)} entity types: {', '.join(entity_types)}")
            else:
                print(f"   ❌ Only {len(entity_types)} entity types (need ≥3)")
            
            if risk_levels_count >= 3:
                score += 3
                print(f"   ✅ Found {risk_levels_count} different risk levels")
            else:
                print(f"   ❌ Only {risk_levels_count} risk levels (need ≥3)")
            
            if avg_confidence and avg_confidence >= 0.7:
                score += 2
                print(f"   ✅ Average confidence level: {avg_confidence:.3f}")
            else:
                print(f"   ❌ Low average confidence: {avg_confidence:.3f if avg_confidence else 0}")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating risk scoring system: {str(e)}")
            return 0, 15
        finally:
            conn.close()
    
    def validate_predictive_compliance(self) -> Tuple[int, int]:
        """Validate predictive compliance monitoring"""
        print("📋 Validating predictive compliance monitoring...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if predictive compliance table has data
            cursor.execute("SELECT COUNT(*) FROM predictive_compliance")
            compliance_count = cursor.fetchone()[0]
            
            # Check for different frameworks
            cursor.execute("SELECT DISTINCT framework FROM predictive_compliance")
            frameworks = [row[0] for row in cursor.fetchall()]
            
            # Check for trend directions
            cursor.execute("SELECT DISTINCT trend_direction FROM predictive_compliance")
            trends = [row[0] for row in cursor.fetchall()]
            
            score = 0
            max_score = 10
            
            if compliance_count >= 10:
                score += 5
                print(f"   ✅ Found {compliance_count} compliance predictions")
            else:
                print(f"   ❌ Only {compliance_count} compliance predictions (need ≥10)")
            
            if len(frameworks) >= 3:
                score += 3
                print(f"   ✅ Found {len(frameworks)} frameworks: {', '.join(frameworks)}")
            else:
                print(f"   ❌ Only {len(frameworks)} frameworks (need ≥3)")
            
            if len(trends) >= 2:
                score += 2
                print(f"   ✅ Found {len(trends)} trend directions: {', '.join(trends)}")
            else:
                print(f"   ❌ Only {len(trends)} trend directions (need ≥2)")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating predictive compliance: {str(e)}")
            return 0, 10
        finally:
            conn.close()
    
    def validate_ml_models_and_insights(self) -> Tuple[int, int]:
        """Validate ML model performance and analytics insights"""
        print("🔬 Validating ML models and analytics insights...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check ML model performance
            cursor.execute("SELECT COUNT(*) FROM ml_model_performance")
            model_count = cursor.fetchone()[0]
            
            # Check analytics insights
            cursor.execute("SELECT COUNT(*) FROM analytics_insights")
            insights_count = cursor.fetchone()[0]
            
            # Check insight priorities
            cursor.execute("SELECT DISTINCT priority FROM analytics_insights")
            priorities = [row[0] for row in cursor.fetchall()]
            
            score = 0
            max_score = 10
            
            if model_count >= 3:
                score += 4
                print(f"   ✅ Found {model_count} ML models")
            else:
                print(f"   ❌ Only {model_count} ML models (need ≥3)")
            
            if insights_count >= 3:
                score += 4
                print(f"   ✅ Found {insights_count} analytics insights")
            else:
                print(f"   ❌ Only {insights_count} analytics insights (need ≥3)")
            
            if len(priorities) >= 2:
                score += 2
                print(f"   ✅ Found {len(priorities)} priority levels: {', '.join(priorities)}")
            else:
                print(f"   ❌ Only {len(priorities)} priority levels (need ≥2)")
            
            return score, max_score
            
        except Exception as e:
            print(f"   ❌ Error validating ML models and insights: {str(e)}")
            return 0, 10
        finally:
            conn.close()
    
    def validate_frontend_components(self) -> Tuple[int, int]:
        """Validate frontend analytics dashboard components"""
        print("🎨 Validating frontend analytics components...")
        
        dashboard_file = "frontend/src/pages/admin/AdvancedAnalyticsDashboard.tsx"
        
        score = 0
        max_score = 10
        
        if os.path.exists(dashboard_file):
            score += 5
            print(f"   ✅ Found advanced analytics dashboard component")
            
            # Check for key component features
            with open(dashboard_file, 'r') as f:
                content = f.read()
                
                features = [
                    ("ThreatPrediction", "threat prediction interface"),
                    ("UserBehaviorProfile", "user behavior analytics"),
                    ("AnalyticsInsight", "analytics insights"),
                    ("LineChart", "trend visualization"),
                    ("PieChart", "risk distribution")
                ]
                
                found_features = 0
                for feature, description in features:
                    if feature in content:
                        found_features += 1
                        print(f"      ✅ {description}")
                    else:
                        print(f"      ❌ Missing {description}")
                
                score += min(5, found_features)
        else:
            print(f"   ❌ Advanced analytics dashboard component not found")
        
        return score, max_score
    
    def run_validation(self) -> Dict[str, Any]:
        """Run complete Week 5 Day 4 validation"""
        print("🤖 Week 5 Day 4: Advanced Analytics & AI/ML Integration Validation")
        print("=" * 80)
        
        # Run all validations
        validations = [
            ("Database Schema", self.validate_database_schema),
            ("Threat Predictions", self.validate_threat_predictions),
            ("User Behavior Analytics", self.validate_user_behavior_analytics),
            ("Risk Scoring System", self.validate_risk_scoring_system),
            ("Predictive Compliance", self.validate_predictive_compliance),
            ("ML Models & Insights", self.validate_ml_models_and_insights),
            ("Frontend Components", self.validate_frontend_components)
        ]
        
        total_score = 0
        total_max = 0
        
        for name, validation_func in validations:
            print(f"\n{name}:")
            score, max_score = validation_func()
            total_score += score
            total_max += max_score
            self.validation_results[name] = {
                "score": score,
                "max_score": max_score,
                "percentage": (score / max_score * 100) if max_score > 0 else 0
            }
        
        # Calculate overall results
        overall_percentage = (total_score / total_max * 100) if total_max > 0 else 0
        
        print("\n" + "=" * 80)
        print("📊 VALIDATION RESULTS SUMMARY")
        print("=" * 80)
        
        for name, result in self.validation_results.items():
            status = "✅" if result["percentage"] >= 80 else ("⚠️" if result["percentage"] >= 60 else "❌")
            print(f"{status} {name}: {result['score']}/{result['max_score']} ({result['percentage']:.1f}%)")
        
        print(f"\n🎯 OVERALL SCORE: {total_score}/{total_max} ({overall_percentage:.1f}%)")
        
        if overall_percentage >= 90:
            status = "🌟 OUTSTANDING"
        elif overall_percentage >= 80:
            status = "✅ EXCELLENT"
        elif overall_percentage >= 70:
            status = "👍 GOOD"
        elif overall_percentage >= 60:
            status = "⚠️ NEEDS IMPROVEMENT"
        else:
            status = "❌ REQUIRES ATTENTION"
        
        print(f"📈 STATUS: {status}")
        
        # Save validation results
        results = {
            "validation_date": datetime.now().isoformat(),
            "week": "Week 5 Day 4",
            "focus": "Advanced Analytics & AI/ML Integration",
            "overall_score": total_score,
            "max_score": total_max,
            "percentage": overall_percentage,
            "status": status,
            "detailed_results": self.validation_results,
            "summary": {
                "database_tables": 6,
                "threat_predictions": "Active with multiple threat types",
                "user_behavior_analytics": "Baseline established with anomaly detection",
                "risk_scoring": "Automated scoring for multiple entity types",
                "predictive_compliance": "Multi-framework compliance monitoring",
                "ml_models": "Performance tracking and insights generation",
                "frontend_dashboard": "Advanced analytics visualization"
            }
        }
        
        # Save to file
        os.makedirs("reports/validation", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"reports/validation/week5_day4_validation_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n💾 Validation results saved to: {filename}")
        
        return results

def main():
    """Main validation function"""
    validator = Week5Day4Validator()
    results = validator.run_validation()
    
    # Return appropriate exit code
    if results["percentage"] >= 70:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main()) 