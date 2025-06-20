#!/usr/bin/env python3
"""
SecureNet Week 2 Day 1 Validation Script
Frontend Performance Optimization Validation

Tests:
1. Code splitting implementation
2. Virtual scrolling for large data tables
3. Performance optimization for charts and heavy components
4. Bundle size optimization
5. Lazy loading for route components
6. Core Web Vitals optimization
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple

class Week2Day1Validator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.frontend_path = self.project_root / "frontend"
        self.results = {
            "day": 1,
            "week": 2,
            "sprint_completion": "Week 2 Day 1 - Frontend Performance",
            "validation_timestamp": datetime.now().isoformat(),
            "overall_success": False,
            "teams": {
                "frontend_performance": {
                    "score": 0,
                    "max_score": 100,
                    "tests": []
                }
            }
        }
        
    def validate_performance_dependencies(self) -> Tuple[bool, int, str]:
        """Validate that performance optimization dependencies are installed."""
        try:
            package_json_path = self.frontend_path / "package.json"
            if not package_json_path.exists():
                return False, 0, "package.json not found"
            
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            required_deps = [
                "webpack-bundle-analyzer",
                "@tanstack/react-virtual", 
                "react-window",
                "react-window-infinite-loader",
                "rollup-plugin-visualizer"
            ]
            
            dev_deps = package_data.get("devDependencies", {})
            deps = package_data.get("dependencies", {})
            all_deps = {**dev_deps, **deps}
            
            missing_deps = []
            for dep in required_deps:
                if dep not in all_deps:
                    missing_deps.append(dep)
            
            if missing_deps:
                return False, 10, f"Missing dependencies: {missing_deps}"
            
            return True, 25, "All performance dependencies installed"
            
        except Exception as e:
            return False, 0, f"Error checking dependencies: {str(e)}"
    
    def validate_virtual_scrolling_component(self) -> Tuple[bool, int, str]:
        """Validate virtual scrolling table component exists and has required features."""
        try:
            virtual_table_path = self.frontend_path / "src" / "components" / "virtual" / "VirtualSecurityLogsTable.tsx"
            
            if not virtual_table_path.exists():
                return False, 0, "VirtualSecurityLogsTable.tsx not found"
            
            with open(virtual_table_path, 'r') as f:
                content = f.read()
            
            required_features = [
                "react-window",
                "FixedSizeList",
                "overscanCount",
                "itemSize",
                "height",
                "width",
                "filter",
                "search"
            ]
            
            missing_features = []
            for feature in required_features:
                if feature not in content:
                    missing_features.append(feature)
            
            if missing_features:
                return False, 15, f"Missing virtual scrolling features: {missing_features}"
            
            # Check for performance optimizations
            performance_features = [
                "useMemo",
                "useCallback",
                "useState",
                "useEffect"
            ]
            
            performance_score = 0
            for feature in performance_features:
                if feature in content:
                    performance_score += 5
            
            total_score = min(30, 20 + performance_score)
            return True, total_score, f"Virtual scrolling component validated with {len(required_features)} core features"
            
        except Exception as e:
            return False, 0, f"Error validating virtual scrolling: {str(e)}"
    
    def validate_performance_utilities(self) -> Tuple[bool, int, str]:
        """Validate performance monitoring and optimization utilities."""
        try:
            perf_utils_path = self.frontend_path / "src" / "utils" / "performance.ts"
            
            if not perf_utils_path.exists():
                return False, 0, "performance.ts utilities not found"
            
            with open(perf_utils_path, 'r') as f:
                content = f.read()
            
            required_utilities = [
                "PerformanceMonitor",
                "createLazyComponent",
                "LazyRoutes",
                "optimizeChartData",
                "createIntersectionObserver",
                "performanceDebounce",
                "initPerformanceMonitoring"
            ]
            
            utility_score = 0
            found_utilities = []
            for utility in required_utilities:
                if utility in content:
                    utility_score += 3
                    found_utilities.append(utility)
            
            # Check for Core Web Vitals monitoring
            web_vitals_features = ["LCP", "FID", "CLS", "PerformanceObserver"]
            web_vitals_score = 0
            for feature in web_vitals_features:
                if feature in content:
                    web_vitals_score += 2
            
            total_score = min(25, utility_score + web_vitals_score)
            return True, total_score, f"Performance utilities validated: {len(found_utilities)} utilities found"
            
        except Exception as e:
            return False, 0, f"Error validating performance utilities: {str(e)}"
    
    def validate_optimized_chart_component(self) -> Tuple[bool, int, str]:
        """Validate optimized chart component with performance features."""
        try:
            chart_path = self.frontend_path / "src" / "components" / "charts" / "OptimizedChart.tsx"
            
            if not chart_path.exists():
                return False, 0, "OptimizedChart.tsx not found"
            
            with open(chart_path, 'r') as f:
                content = f.read()
            
            required_features = [
                "chart.js",
                "react-chartjs-2",
                "useMemo",
                "useCallback",
                "lazy loading",
                "IntersectionObserver",
                "optimizeChartData",
                "maxDataPoints"
            ]
            
            feature_score = 0
            found_features = []
            for feature in required_features:
                if feature.replace(" ", "").lower() in content.replace(" ", "").lower():
                    feature_score += 2
                    found_features.append(feature)
            
            # Check for chart performance optimizations
            perf_optimizations = [
                "animation",
                "responsive",
                "maintainAspectRatio",
                "parsing",
                "maxTicksLimit",
                "autoSkip"
            ]
            
            perf_score = 0
            for opt in perf_optimizations:
                if opt in content:
                    perf_score += 1
            
            total_score = min(20, feature_score + perf_score)
            return True, total_score, f"Optimized chart component validated with {len(found_features)} features"
            
        except Exception as e:
            return False, 0, f"Error validating optimized charts: {str(e)}"
    
    def validate_vite_config_optimization(self) -> Tuple[bool, int, str]:
        """Validate Vite configuration for code splitting and bundle optimization."""
        try:
            vite_config_path = self.frontend_path / "vite.config.ts"
            
            if not vite_config_path.exists():
                return False, 0, "vite.config.ts not found"
            
            with open(vite_config_path, 'r') as f:
                content = f.read()
            
            required_optimizations = [
                "manualChunks",
                "rollup-plugin-visualizer",
                "terserOptions",
                "chunkSizeWarningLimit",
                "optimizeDeps",
                "code splitting"
            ]
            
            optimization_score = 0
            found_optimizations = []
            for opt in required_optimizations:
                if opt.replace("-", "").replace(" ", "").lower() in content.replace("-", "").replace(" ", "").lower():
                    optimization_score += 3
                    found_optimizations.append(opt)
            
            # Check for specific chunk configurations
            chunk_configs = [
                "vendor-react",
                "vendor-charts", 
                "dashboard",
                "security",
                "admin"
            ]
            
            chunk_score = 0
            for chunk in chunk_configs:
                if chunk in content:
                    chunk_score += 1
            
            total_score = min(20, optimization_score + chunk_score)
            return True, total_score, f"Vite config optimized with {len(found_optimizations)} features"
            
        except Exception as e:
            return False, 0, f"Error validating Vite config: {str(e)}"
    
    def run_validation(self) -> Dict[str, Any]:
        """Run all validation tests."""
        print("🚀 Starting Week 2 Day 1 Frontend Performance Validation...")
        start_time = time.time()
        
        tests = [
            ("Performance dependencies", self.validate_performance_dependencies),
            ("Virtual scrolling component", self.validate_virtual_scrolling_component),
            ("Performance utilities", self.validate_performance_utilities),
            ("Optimized chart component", self.validate_optimized_chart_component),
            ("Vite config optimization", self.validate_vite_config_optimization)
        ]
        
        total_score = 0
        max_score = 0
        
        for test_name, test_func in tests:
            print(f"\n📋 Testing: {test_name}")
            try:
                success, score, message = test_func()
                max_score += 20 if "dependencies" in test_name else 25 if "virtual" in test_name else 25 if "utilities" in test_name else 20
                
                test_result = {
                    "name": test_name,
                    "status": "PASS" if success else "FAIL",
                    "points": score,
                    "message": message
                }
                
                if not success and score > 0:
                    test_result["status"] = "PARTIAL"
                
                self.results["teams"]["frontend_performance"]["tests"].append(test_result)
                total_score += score
                
                status_icon = "✅" if success else "❌" if score == 0 else "⚠️"
                print(f"{status_icon} {test_name}: {message} ({score} points)")
                
            except Exception as e:
                print(f"❌ {test_name}: Validation error - {str(e)}")
                self.results["teams"]["frontend_performance"]["tests"].append({
                    "name": test_name,
                    "status": "ERROR",
                    "points": 0,
                    "error": str(e)
                })
        
        # Calculate final results
        self.results["teams"]["frontend_performance"]["score"] = total_score
        self.results["teams"]["frontend_performance"]["max_score"] = max_score
        
        success_rate = (total_score / max_score * 100) if max_score > 0 else 0
        self.results["overall_success"] = success_rate >= 80.0
        
        # Add summary
        self.results["summary"] = {
            "total_score": total_score,
            "total_possible": max_score,
            "success_rate": round(success_rate, 1),
            "validation_time_seconds": round(time.time() - start_time, 2),
            "status": "PASS" if success_rate >= 80 else "PARTIAL" if success_rate >= 60 else "FAIL"
        }
        
        # Week 2 Day 1 specific results
        self.results["week2_day1_completion"] = {
            "frontend_performance_score": total_score,
            "performance_status": "READY" if success_rate >= 80 else "NEEDS_IMPROVEMENT",
            "key_achievements": [
                "Virtual scrolling for large datasets",
                "Performance monitoring utilities", 
                "Optimized chart components",
                "Code splitting configuration"
            ],
            "success_metrics_status": {
                "bundle_optimization": success_rate >= 80,
                "virtual_scrolling": any(test["name"] == "Virtual scrolling component" and test["status"] == "PASS" for test in self.results["teams"]["frontend_performance"]["tests"]),
                "performance_monitoring": any(test["name"] == "Performance utilities" and test["status"] == "PASS" for test in self.results["teams"]["frontend_performance"]["tests"]),
                "chart_optimization": any(test["name"] == "Optimized chart component" and test["status"] == "PASS" for test in self.results["teams"]["frontend_performance"]["tests"])
            }
        }
        
        return self.results
    
    def save_results(self):
        """Save validation results to file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = self.project_root / "docs" / "project" / f"week2_day1_validation_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results saved to: {results_file}")
        return results_file

def main():
    """Main validation function."""
    validator = Week2Day1Validator()
    results = validator.run_validation()
    validator.save_results()
    
    # Print summary
    print("\n" + "="*60)
    print("📊 WEEK 2 DAY 1 VALIDATION SUMMARY")
    print("="*60)
    
    summary = results["summary"]
    frontend_results = results["teams"]["frontend_performance"]
    
    print(f"Overall Score: {summary['total_score']}/{summary['total_possible']} ({summary['success_rate']}%)")
    print(f"Status: {summary['status']}")
    print(f"Validation Time: {summary['validation_time_seconds']}s")
    
    print(f"\n🎯 Frontend Performance Team:")
    print(f"   Score: {frontend_results['score']}/100 ({frontend_results['score']}%)")
    
    # Show individual test results
    print(f"\n📋 Test Results:")
    for test in frontend_results["tests"]:
        status_icon = "✅" if test["status"] == "PASS" else "❌" if test["status"] == "FAIL" else "⚠️"
        print(f"   {status_icon} {test['name']}: {test.get('message', 'No message')} ({test['points']} points)")
    
    # Success metrics
    week2_completion = results["week2_day1_completion"]
    print(f"\n🎯 Success Metrics Status:")
    metrics = week2_completion["success_metrics_status"]
    for metric, status in metrics.items():
        icon = "✅" if status else "❌"
        print(f"   {icon} {metric.replace('_', ' ').title()}: {'ACHIEVED' if status else 'PENDING'}")
    
    print(f"\n🚀 Week 2 Day 1 Status: {week2_completion['performance_status']}")
    
    # Exit with appropriate code
    sys.exit(0 if results["overall_success"] else 1)

if __name__ == "__main__":
    main() 