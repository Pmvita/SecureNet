#!/usr/bin/env python3
"""
Week 6 Day 1 Validation: User Onboarding Refinement
Validates help system, demo mode, onboarding flow, and feedback collection
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any

DATABASE_PATH = "data/securenet.db"

class Week6Day1Validator:
    """Validator for Week 6 Day 1 User Onboarding Refinement"""
    
    def __init__(self):
        self.db_path = DATABASE_PATH
        self.validation_results = {}
        
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def validate_help_system(self):
        """Validate help articles system"""
        print("📚 Validating help system...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if help_articles table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='help_articles'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Help articles table not found"}
            
            # Count help articles
            cursor.execute("SELECT COUNT(*) as count FROM help_articles")
            article_count = cursor.fetchone()['count']
            
            # Check article categories
            cursor.execute("SELECT DISTINCT category FROM help_articles")
            categories = [row['category'] for row in cursor.fetchall()]
            
            # Check difficulty levels
            cursor.execute("SELECT DISTINCT difficulty_level FROM help_articles")
            difficulty_levels = [row['difficulty_level'] for row in cursor.fetchall()]
            
            score = 0
            if article_count >= 5:
                score += 5
            if len(categories) >= 3:
                score += 3
            if len(difficulty_levels) >= 2:
                score += 2
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "article_count": article_count,
                "categories": categories,
                "difficulty_levels": difficulty_levels
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_demo_mode(self):
        """Validate demo mode configurations"""
        print("🎭 Validating demo mode...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check demo_configurations table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='demo_configurations'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Demo configurations table not found"}
            
            # Count demo configurations
            cursor.execute("SELECT COUNT(*) as count FROM demo_configurations")
            config_count = cursor.fetchone()['count']
            
            # Check demo types
            cursor.execute("SELECT DISTINCT demo_type FROM demo_configurations")
            demo_types = [row['demo_type'] for row in cursor.fetchall()]
            
            score = 0
            if config_count >= 3:
                score += 5
            if len(demo_types) >= 3:
                score += 5
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "config_count": config_count,
                "demo_types": demo_types
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_onboarding_flow(self):
        """Validate onboarding steps"""
        print("🚀 Validating onboarding flow...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check onboarding_steps table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='onboarding_steps'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "Onboarding steps table not found"}
            
            # Count onboarding steps
            cursor.execute("SELECT COUNT(*) as count FROM onboarding_steps")
            steps_count = cursor.fetchone()['count']
            
            # Check required vs optional steps
            cursor.execute("SELECT COUNT(*) as count FROM onboarding_steps WHERE is_required = 1")
            required_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM onboarding_steps WHERE is_required = 0")
            optional_count = cursor.fetchone()['count']
            
            # Check completion rates
            cursor.execute("SELECT AVG(completion_rate) as avg_rate FROM onboarding_steps")
            avg_completion_rate = cursor.fetchone()['avg_rate'] or 0
            
            score = 0
            if steps_count >= 8:
                score += 5
            if required_count >= 5:
                score += 3
            if avg_completion_rate >= 75:
                score += 2
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "steps_count": steps_count,
                "required_count": required_count,
                "optional_count": optional_count,
                "avg_completion_rate": round(avg_completion_rate, 1)
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_feedback_system(self):
        """Validate user feedback collection"""
        print("📝 Validating feedback system...")
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check user_feedback table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_feedback'")
            table_exists = cursor.fetchone() is not None
            
            if not table_exists:
                return {"status": "failed", "score": 0, "message": "User feedback table not found"}
            
            # Count feedback entries
            cursor.execute("SELECT COUNT(*) as count FROM user_feedback")
            feedback_count = cursor.fetchone()['count']
            
            # Check feedback types
            cursor.execute("SELECT DISTINCT feedback_type FROM user_feedback")
            feedback_types = [row['feedback_type'] for row in cursor.fetchall()]
            
            # Check feature areas
            cursor.execute("SELECT DISTINCT feature_area FROM user_feedback")
            feature_areas = [row['feature_area'] for row in cursor.fetchall()]
            
            # Check average rating
            cursor.execute("SELECT AVG(rating) as avg_rating FROM user_feedback")
            avg_rating = cursor.fetchone()['avg_rating'] or 0
            
            score = 0
            if feedback_count >= 5:
                score += 3
            if len(feedback_types) >= 3:
                score += 3
            if len(feature_areas) >= 3:
                score += 2
            if avg_rating >= 4.0:
                score += 2
            
            return {
                "status": "passed" if score >= 8 else "partial",
                "score": score,
                "max_score": 10,
                "feedback_count": feedback_count,
                "feedback_types": feedback_types,
                "feature_areas": feature_areas,
                "avg_rating": round(avg_rating, 1)
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def validate_database_schema(self):
        """Validate all required tables exist"""
        print("🗄️ Validating database schema...")
        
        required_tables = [
            'help_articles',
            'onboarding_steps', 
            'user_feedback',
            'demo_configurations',
            'user_onboarding_progress',
            'help_article_views'
        ]
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            existing_tables = []
            for table in required_tables:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if cursor.fetchone():
                    existing_tables.append(table)
            
            score = len(existing_tables) * 2
            
            return {
                "status": "passed" if len(existing_tables) == len(required_tables) else "partial",
                "score": score,
                "max_score": len(required_tables) * 2,
                "existing_tables": existing_tables,
                "missing_tables": [t for t in required_tables if t not in existing_tables]
            }
            
        except Exception as e:
            return {"status": "failed", "score": 0, "error": str(e)}
        finally:
            conn.close()
    
    def run_validation(self):
        """Run complete validation for Week 6 Day 1"""
        print("🧪 Running Week 6 Day 1 Validation: User Onboarding Refinement")
        print("=" * 80)
        
        # Run all validations
        self.validation_results = {
            "database_schema": self.validate_database_schema(),
            "help_system": self.validate_help_system(),
            "demo_mode": self.validate_demo_mode(),
            "onboarding_flow": self.validate_onboarding_flow(),
            "feedback_system": self.validate_feedback_system()
        }
        
        # Calculate total score
        total_score = sum(result.get("score", 0) for result in self.validation_results.values())
        max_total_score = sum(result.get("max_score", 10) for result in self.validation_results.values())
        success_rate = (total_score / max_total_score) * 100 if max_total_score > 0 else 0
        
        # Determine overall status
        if success_rate >= 90:
            overall_status = "EXCELLENT"
        elif success_rate >= 80:
            overall_status = "GOOD"
        elif success_rate >= 70:
            overall_status = "SATISFACTORY"
        else:
            overall_status = "NEEDS_IMPROVEMENT"
        
        # Print results
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"Database Schema: {self.validation_results['database_schema']['score']}/{self.validation_results['database_schema']['max_score']} points")
        print(f"Help System: {self.validation_results['help_system']['score']}/{self.validation_results['help_system']['max_score']} points")
        print(f"Demo Mode: {self.validation_results['demo_mode']['score']}/{self.validation_results['demo_mode']['max_score']} points")
        print(f"Onboarding Flow: {self.validation_results['onboarding_flow']['score']}/{self.validation_results['onboarding_flow']['max_score']} points")
        print(f"Feedback System: {self.validation_results['feedback_system']['score']}/{self.validation_results['feedback_system']['max_score']} points")
        
        print(f"\n🎯 TOTAL SCORE: {total_score}/{max_total_score} ({success_rate:.1f}%)")
        print(f"📈 OVERALL STATUS: {overall_status}")
        
        # Save results
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "week": 6,
            "day": 1,
            "focus": "User Onboarding Refinement",
            "total_score": total_score,
            "max_score": max_total_score,
            "success_rate": success_rate,
            "overall_status": overall_status,
            "validation_results": self.validation_results
        }
        
        os.makedirs("reports/validation", exist_ok=True)
        with open(f"reports/validation/week6_day1_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
            json.dump(results_data, f, indent=2, default=str)
        
        return results_data

def main():
    validator = Week6Day1Validator()
    return validator.run_validation()

if __name__ == "__main__":
    main() 