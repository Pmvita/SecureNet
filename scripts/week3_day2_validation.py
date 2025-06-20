#!/usr/bin/env python3
"""
Week 3 Day 2 Validation: Advanced Analytics & Reporting
SecureNet Enterprise - Advanced Business Intelligence Validation

Validates:
1. Business Intelligence Dashboards (25 points)
2. Custom Report Generation (25 points) 
3. Advanced Data Visualization (25 points)
4. Real-time Analytics Engine (25 points)

Total: 100 points
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from utils.week3_day2_advanced_analytics import (
        Week3Day2AdvancedAnalytics,
        ReportType,
        VisualizationType,
        ReportConfig
    )
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Make sure utils/week3_day2_advanced_analytics.py exists and is properly configured")
    sys.exit(1)

class Week3Day2Validator:
    """Comprehensive Week 3 Day 2 Advanced Analytics Validation"""
    
    def __init__(self):
        self.total_score = 0
        self.max_score = 100
        self.component_scores = {
            "business_intelligence": 0,
            "custom_reporting": 0,
            "advanced_visualization": 0,
            "real_time_analytics": 0
        }
        self.validation_results = []
        self.start_time = time.time()
    
    def log_result(self, component: str, test_name: str, passed: bool, points: int, details: str = ""):
        """Log validation result"""
        status = "✅" if passed else "❌"
        print(f"  {status} {test_name}")
        if details:
            print(f"    {details}")
        
        if passed:
            self.component_scores[component] += points
            self.total_score += points
        
        self.validation_results.append({
            "component": component,
            "test": test_name,
            "passed": passed,
            "points_earned": points if passed else 0,
            "max_points": points,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    async def validate_business_intelligence(self, analytics: Week3Day2AdvancedAnalytics) -> int:
        """Validate Business Intelligence Dashboards (25 points)"""
        print("\n🎯 Validating Business Intelligence Dashboards...")
        component_score = 0
        
        try:
            # Test 1: Executive Dashboard Creation (6 points)
            exec_dashboard = analytics.bi_dashboard.create_executive_dashboard("test_org")
            dashboard_valid = (
                exec_dashboard.get("dashboard_id") and
                exec_dashboard.get("title") == "Executive Security Dashboard" and
                len(exec_dashboard.get("widgets", [])) >= 4
            )
            self.log_result("business_intelligence", "Executive dashboard creation", dashboard_valid, 6,
                          f"Dashboard ID: {exec_dashboard.get('dashboard_id', 'None')}")
            
            # Test 2: SOC Analyst Dashboard Creation (6 points)
            soc_dashboard = analytics.bi_dashboard.create_soc_analyst_dashboard("test_analyst")
            soc_valid = (
                soc_dashboard.get("dashboard_id") and
                soc_dashboard.get("title") == "SOC Analyst Operations Dashboard" and
                len(soc_dashboard.get("widgets", [])) >= 4
            )
            self.log_result("business_intelligence", "SOC analyst dashboard creation", soc_valid, 6,
                          f"Dashboard ID: {soc_dashboard.get('dashboard_id', 'None')}")
            
            # Test 3: Dashboard Data Retrieval (5 points)
            retrieved_data = analytics.bi_dashboard.get_dashboard_data(exec_dashboard["dashboard_id"])
            retrieval_valid = retrieved_data is not None and retrieved_data["dashboard_id"] == exec_dashboard["dashboard_id"]
            self.log_result("business_intelligence", "Dashboard data retrieval", retrieval_valid, 5,
                          f"Retrieved dashboard: {retrieved_data is not None}")
            
            # Test 4: Real-time Metrics Update (4 points)
            test_metrics = {"cpu_usage": 45.2, "memory_usage": 67.8, "active_threats": 12}
            analytics.bi_dashboard.update_real_time_metrics(exec_dashboard["dashboard_id"], test_metrics)
            updated_dashboard = analytics.bi_dashboard.get_dashboard_data(exec_dashboard["dashboard_id"])
            metrics_valid = updated_dashboard.get("real_time_data") == test_metrics
            self.log_result("business_intelligence", "Real-time metrics update", metrics_valid, 4,
                          f"Metrics updated: {metrics_valid}")
            
            # Test 5: Dashboard Configuration Validation (4 points)
            config_valid = (
                exec_dashboard.get("refresh_interval") == 300 and
                soc_dashboard.get("refresh_interval") == 30 and
                all(widget.get("type") for widget in exec_dashboard.get("widgets", []))
            )
            self.log_result("business_intelligence", "Dashboard configuration validation", config_valid, 4,
                          f"Executive refresh: {exec_dashboard.get('refresh_interval')}s, SOC refresh: {soc_dashboard.get('refresh_interval')}s")
            
        except Exception as e:
            self.log_result("business_intelligence", "Business Intelligence validation", False, 25,
                          f"Error: {str(e)}")
        
        return self.component_scores["business_intelligence"]
    
    async def validate_custom_reporting(self, analytics: Week3Day2AdvancedAnalytics) -> int:
        """Validate Custom Report Generation (25 points)"""
        print("\n📊 Validating Custom Report Generation...")
        
        try:
            # Test 1: Security Summary Report Generation (7 points)
            security_report = analytics.report_generator.create_security_summary_report(
                "test_org", {"start_date": "2025-05-01", "end_date": "2025-06-01"}
            )
            security_valid = (
                security_report.get("report_type") == ReportType.SECURITY_SUMMARY.value and
                security_report.get("sections") and
                "executive_summary" in security_report["sections"] and
                "threat_landscape" in security_report["sections"]
            )
            self.log_result("custom_reporting", "Security summary report generation", security_valid, 7,
                          f"Report ID: {security_report.get('report_id', 'None')}")
            
            # Test 2: Compliance Audit Report Generation (7 points)
            compliance_report = analytics.report_generator.create_compliance_audit_report("test_org", "SOC2")
            compliance_valid = (
                compliance_report.get("report_type") == ReportType.COMPLIANCE_AUDIT.value and
                compliance_report.get("framework") == "SOC2" and
                compliance_report.get("audit_results") and
                "overall_score" in compliance_report["audit_results"]
            )
            self.log_result("custom_reporting", "Compliance audit report generation", compliance_valid, 7,
                          f"Framework: {compliance_report.get('framework')}, Score: {compliance_report.get('audit_results', {}).get('overall_score')}")
            
            # Test 3: Custom Analytics Report Creation (6 points)
            custom_config = ReportConfig(
                report_id="test_custom_report",
                report_type=ReportType.CUSTOM_ANALYTICS,
                title="Test Custom Analytics",
                description="Test report for validation",
                filters={"severity": "high"},
                visualization_type=VisualizationType.LINE_CHART,
                data_sources=["security_events", "network_logs"],
                refresh_interval=3600,
                created_by="test_user",
                created_at=datetime.now()
            )
            custom_report = analytics.report_generator.create_custom_analytics_report(custom_config)
            custom_valid = (
                custom_report.get("report_id") == "test_custom_report" and
                custom_report.get("data") and
                custom_report.get("visualizations") and
                custom_report.get("insights")
            )
            self.log_result("custom_reporting", "Custom analytics report creation", custom_valid, 6,
                          f"Visualizations: {len(custom_report.get('visualizations', []))}, Insights: {len(custom_report.get('insights', []))}")
            
            # Test 4: Report Retrieval and Listing (3 points)
            retrieved_report = analytics.report_generator.get_report(security_report["report_id"])
            report_list = analytics.report_generator.list_reports("test_org")
            retrieval_valid = (
                retrieved_report is not None and
                retrieved_report["report_id"] == security_report["report_id"] and
                len(report_list) >= 2
            )
            self.log_result("custom_reporting", "Report retrieval and listing", retrieval_valid, 3,
                          f"Reports for org: {len(report_list)}")
            
            # Test 5: Async Report Generation (2 points)
            async_report = await analytics.report_generator.generate_report_async(custom_config)
            async_valid = async_report is not None and async_report.get("report_id")
            self.log_result("custom_reporting", "Async report generation", async_valid, 2,
                          f"Async report generated: {async_valid}")
            
        except Exception as e:
            self.log_result("custom_reporting", "Custom Reporting validation", False, 25,
                          f"Error: {str(e)}")
        
        return self.component_scores["custom_reporting"]
    
    async def validate_advanced_visualization(self, analytics: Week3Day2AdvancedAnalytics) -> int:
        """Validate Advanced Data Visualization (25 points)"""
        print("\n🎨 Validating Advanced Data Visualization...")
        
        try:
            # Test 1: Security Heatmap Creation (8 points)
            heatmap = analytics.data_visualization.create_security_heatmap({})
            heatmap_valid = (
                heatmap.get("type") == "heatmap" and
                heatmap.get("title") == "Security Threat Heatmap" and
                heatmap.get("data") and
                len(heatmap.get("data", [])) > 0
            )
            self.log_result("advanced_visualization", "Security heatmap creation", heatmap_valid, 8,
                          f"Heatmap ID: {heatmap.get('visualization_id')}")
            
            # Test 2: Network Topology Graph Creation (8 points)
            topology = analytics.data_visualization.create_network_topology_graph({})
            topology_valid = (
                topology.get("type") == "network_graph" and
                topology.get("nodes") and
                topology.get("edges") and
                len(topology.get("nodes", [])) >= 8 and
                len(topology.get("edges", [])) >= 7
            )
            self.log_result("advanced_visualization", "Network topology graph creation", topology_valid, 8,
                          f"Nodes: {len(topology.get('nodes', []))}, Edges: {len(topology.get('edges', []))}")
            
            # Test 3: Threat Intelligence Sankey Diagram (6 points)
            sankey = analytics.data_visualization.create_threat_intelligence_sankey({})
            sankey_valid = (
                sankey.get("type") == "sankey_diagram" and
                sankey.get("data") and
                sankey.get("data", {}).get("nodes") and
                sankey.get("data", {}).get("links")
            )
            self.log_result("advanced_visualization", "Threat intelligence Sankey diagram", sankey_valid, 6,
                          f"Sankey nodes: {len(sankey.get('data', {}).get('nodes', []))}")
            
            # Test 4: Visualization Retrieval (2 points)
            retrieved_viz = analytics.data_visualization.get_visualization(heatmap["visualization_id"])
            retrieval_valid = retrieved_viz is not None and retrieved_viz["visualization_id"] == heatmap["visualization_id"]
            self.log_result("advanced_visualization", "Visualization retrieval", retrieval_valid, 2,
                          f"Retrieved: {retrieved_viz is not None}")
            
            # Test 5: Visualization Configuration Validation (1 point)
            config_valid = (
                heatmap.get("config", {}).get("color_scale") == "red_yellow_green" and
                topology.get("config", {}).get("layout") == "force_directed" and
                sankey.get("config", {}).get("flow_metric") == "threat_volume"
            )
            self.log_result("advanced_visualization", "Visualization configuration validation", config_valid, 1,
                          f"Configurations valid: {config_valid}")
            
        except Exception as e:
            self.log_result("advanced_visualization", "Advanced Visualization validation", False, 25,
                          f"Error: {str(e)}")
        
        return self.component_scores["advanced_visualization"]
    
    async def validate_real_time_analytics(self, analytics: Week3Day2AdvancedAnalytics) -> int:
        """Validate Real-time Analytics Engine (25 points)"""
        print("\n⚡ Validating Real-time Analytics Engine...")
        
        try:
            # Test 1: Security Metrics Stream Initialization (8 points)
            stream_id = analytics.analytics_engine.start_security_metrics_stream("test_org")
            stream_status = analytics.analytics_engine.get_stream_status(stream_id)
            stream_valid = (
                stream_id and
                stream_status and
                stream_status.get("status") == "active" and
                len(stream_status.get("metrics", [])) >= 5
            )
            self.log_result("real_time_analytics", "Security metrics stream initialization", stream_valid, 8,
                          f"Stream ID: {stream_id}, Metrics: {len(stream_status.get('metrics', []))}")
            
            # Test 2: Real-time Data Processing (8 points)
            test_data = {
                "cpu_usage": 65.4,
                "memory_usage": 78.2,
                "network_traffic": 1024.5,
                "active_connections": 234,
                "threat_detections": 5
            }
            processed_data = analytics.analytics_engine.process_real_time_data(stream_id, test_data)
            processing_valid = (
                processed_data.get("stream_id") == stream_id and
                processed_data.get("processed_metrics") and
                processed_data.get("trends") and
                "threats_per_minute" in processed_data["processed_metrics"]
            )
            self.log_result("real_time_analytics", "Real-time data processing", processing_valid, 8,
                          f"Processed metrics: {len(processed_data.get('processed_metrics', {}))}")
            
            # Test 3: Alert Generation and Monitoring (5 points)
            alerts = processed_data.get("alerts", [])
            trends = processed_data.get("trends", {})
            monitoring_valid = (
                isinstance(alerts, list) and
                trends.get("confidence_score") is not None and
                trends.get("threat_trend") in ["increasing", "decreasing", "stable"]
            )
            self.log_result("real_time_analytics", "Alert generation and monitoring", monitoring_valid, 5,
                          f"Alerts: {len(alerts)}, Threat trend: {trends.get('threat_trend')}")
            
            # Test 4: Stream Management (2 points)
            stop_result = analytics.analytics_engine.stop_stream(stream_id)
            stopped_status = analytics.analytics_engine.get_stream_status(stream_id)
            management_valid = (
                stop_result and
                stopped_status.get("status") == "stopped" and
                stopped_status.get("stopped_at") is not None
            )
            self.log_result("real_time_analytics", "Stream management", management_valid, 2,
                          f"Stream stopped: {stop_result}")
            
            # Test 5: Analytics Engine Integration (2 points)
            engine_status = len(analytics.analytics_engine.active_streams) >= 1
            integration_valid = engine_status
            self.log_result("real_time_analytics", "Analytics engine integration", integration_valid, 2,
                          f"Active streams: {len(analytics.analytics_engine.active_streams)}")
            
        except Exception as e:
            self.log_result("real_time_analytics", "Real-time Analytics validation", False, 25,
                          f"Error: {str(e)}")
        
        return self.component_scores["real_time_analytics"]
    
    async def run_comprehensive_validation(self) -> Dict:
        """Run complete Week 3 Day 2 validation"""
        print("🚀 Starting Week 3 Day 2: Advanced Analytics & Reporting Validation")
        print("=" * 80)
        
        try:
            # Initialize Advanced Analytics
            analytics = Week3Day2AdvancedAnalytics()
            initialization_result = await analytics.initialize_advanced_analytics()
            
            if initialization_result.get("status") != "initialized":
                print("❌ Failed to initialize advanced analytics platform")
                return self.generate_final_report()
            
            print(f"✅ Advanced analytics platform initialized: {initialization_result['status']}")
            
            # Run component validations
            bi_score = await self.validate_business_intelligence(analytics)
            reporting_score = await self.validate_custom_reporting(analytics)
            visualization_score = await self.validate_advanced_visualization(analytics)
            analytics_score = await self.validate_real_time_analytics(analytics)
            
            return self.generate_final_report()
            
        except Exception as e:
            print(f"\n❌ Critical validation error: {str(e)}")
            return self.generate_final_report()
    
    def generate_final_report(self) -> Dict:
        """Generate comprehensive validation report"""
        duration = time.time() - self.start_time
        
        # Calculate component percentages
        component_percentages = {}
        for component, score in self.component_scores.items():
            component_percentages[component] = (score / 25) * 100
        
        # Determine overall status
        percentage = (self.total_score / self.max_score) * 100
        if percentage >= 95:
            status = "OUTSTANDING"
        elif percentage >= 85:
            status = "EXCELLENT"
        elif percentage >= 75:
            status = "GOOD"
        elif percentage >= 65:
            status = "SATISFACTORY"
        else:
            status = "NEEDS IMPROVEMENT"
        
        # Production readiness assessment
        production_ready = all(score >= 20 for score in self.component_scores.values())
        
        report = {
            "validation_summary": {
                "total_score": self.total_score,
                "max_score": self.max_score,
                "percentage": round(percentage, 1),
                "status": status,
                "duration_seconds": round(duration, 2),
                "production_ready": production_ready
            },
            "component_scores": {
                "business_intelligence": {
                    "score": self.component_scores["business_intelligence"],
                    "max_score": 25,
                    "percentage": round(component_percentages["business_intelligence"], 1)
                },
                "custom_reporting": {
                    "score": self.component_scores["custom_reporting"],
                    "max_score": 25,
                    "percentage": round(component_percentages["custom_reporting"], 1)
                },
                "advanced_visualization": {
                    "score": self.component_scores["advanced_visualization"],
                    "max_score": 25,
                    "percentage": round(component_percentages["advanced_visualization"], 1)
                },
                "real_time_analytics": {
                    "score": self.component_scores["real_time_analytics"],
                    "max_score": 25,
                    "percentage": round(component_percentages["real_time_analytics"], 1)
                }
            },
            "detailed_results": self.validation_results,
            "timestamp": datetime.now().isoformat()
        }
        
        return report

def print_final_summary(report: Dict):
    """Print comprehensive validation summary"""
    print("\n" + "=" * 80)
    print("📊 WEEK 3 DAY 2 VALIDATION SUMMARY")
    print("=" * 80)
    
    summary = report["validation_summary"]
    print(f"🎯 Total Score: {summary['total_score']}/{summary['max_score']} ({summary['percentage']}%)")
    print(f"📈 Status: {summary['status']}")
    print(f"⏱️  Duration: {summary['duration_seconds']} seconds")
    
    print(f"\n📋 Component Breakdown:")
    for component, scores in report["component_scores"].items():
        component_name = component.replace("_", " ").title()
        print(f"  • {component_name}: {scores['score']}/{scores['max_score']} ({scores['percentage']}%)")
    
    print(f"\n🚀 Production Ready: {'YES' if summary['production_ready'] else 'NO'}")
    
    if summary["percentage"] >= 95:
        print(f"\n🎉 OUTSTANDING! Week 3 Day 2 advanced analytics implementation is exceptional!")
    elif summary["percentage"] >= 85:
        print(f"\n🎉 EXCELLENT! Week 3 Day 2 advanced analytics implementation is production-ready!")
    elif summary["percentage"] >= 75:
        print(f"\n✅ GOOD! Week 3 Day 2 implementation meets requirements with minor improvements needed.")
    else:
        print(f"\n⚠️  Week 3 Day 2 implementation needs significant improvements before production deployment.")

async def main():
    """Main validation execution"""
    validator = Week3Day2Validator()
    
    try:
        report = await validator.run_comprehensive_validation()
        print_final_summary(report)
        
        # Save validation results
        results_file = f"week3_day2_validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n💾 Validation results saved to: {results_file}")
        
        # Return appropriate exit code
        return 0 if report["validation_summary"]["production_ready"] else 1
        
    except Exception as e:
        print(f"\n❌ Validation failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 