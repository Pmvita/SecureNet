#!/usr/bin/env python3
"""
Simple CVE Integration Test
Demonstrates basic CVE functionality
"""

import asyncio
import json
from cve_integration import CVEIntegration

async def simple_cve_test():
    """Simple test of CVE integration"""
    print("🔍 SecureNet CVE Integration - Simple Test")
    print("=" * 45)
    
    # Initialize CVE integration
    cve_integration = CVEIntegration()
    
    # Test 1: Search for a few Cisco CVEs
    print("\n1. 🔍 Searching for Cisco CVEs...")
    try:
        cisco_cves = await cve_integration.search_cves_by_keyword("Cisco", limit=3)
        print(f"   Found {len(cisco_cves)} Cisco CVEs")
        
        for i, cve in enumerate(cisco_cves, 1):
            severity = cve.cvss_v3_severity or "UNKNOWN"
            score = cve.cvss_v3_score or "N/A"
            print(f"   {i}. {cve.cve_id}: {severity} ({score})")
            print(f"      {cve.description[:80]}...")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Search for recent critical CVEs
    print("\n2. 🚨 Searching for CRITICAL CVEs...")
    try:
        critical_cves = await cve_integration.search_high_severity_cves("CRITICAL")
        print(f"   Found {len(critical_cves)} CRITICAL CVEs")
        
        for i, cve in enumerate(critical_cves[:3], 1):
            kev_status = "🔥 KEV" if cve.is_kev else ""
            print(f"   {i}. {cve.cve_id}: {cve.cvss_v3_score} {kev_status}")
            print(f"      {cve.description[:60]}...")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 3: Test device analysis with mock data
    print("\n3. 🖥️  Testing device vulnerability analysis...")
    
    mock_device = {
        'ip': '192.168.1.1',
        'name': 'cisco-router-test',
        'type': 'Router',
        'open_ports': [22, 80, 443]
    }
    
    try:
        vulnerabilities = await cve_integration.analyze_device_vulnerabilities(mock_device)
        print(f"   Found {len(vulnerabilities)} potential vulnerabilities")
        
        # Show high-risk vulnerabilities
        high_risk = [v for v in vulnerabilities if v.risk_level in ['HIGH', 'CRITICAL']]
        print(f"   High/Critical risk: {len(high_risk)}")
        
        for vuln in high_risk[:3]:
            print(f"   - {vuln.cve_id}: {vuln.severity} ({vuln.score}) - {vuln.detection_confidence:.1%} confidence")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n✅ Simple CVE test completed!")
    print("\n🔗 Available API endpoints:")
    print("   GET  /api/cve/summary")
    print("   POST /api/cve/scan")
    print("   GET  /api/cve/search?keyword=cisco")
    print("   GET  /api/cve/recent?days=7")
    print("   GET  /api/cve/stats")

if __name__ == "__main__":
    print("🛡️  SecureNet CVE Integration - Simple Test")
    print("   Testing basic CVE functionality")
    
    asyncio.run(simple_cve_test())
    
    print("\n📚 Next Steps:")
    print("1. Get NVD API key for faster requests")
    print("2. Start SecureNet server: uvicorn app:app --reload")
    print("3. Test CVE endpoints with curl or browser") 