#!/usr/bin/env python3
"""
SecureNet CVE Integration Module
AI-Powered Vulnerability Intelligence System

This module integrates with the NIST National Vulnerability Database (NVD) API
to provide real-time CVE data for enhanced security analysis of network devices.

Features:
- Real-time CVE data fetching from NVD API 2.0
- Device-specific vulnerability mapping
- CVSS scoring and risk assessment
- AI-powered threat prioritization
- Automated vulnerability reporting
"""

import asyncio
import aiohttp
import json
import logging
import sqlite3
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from urllib.parse import urlencode
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CVEData:
    """CVE data structure"""
    cve_id: str
    description: str
    cvss_v3_score: Optional[float]
    cvss_v3_severity: Optional[str]
    cvss_v3_vector: Optional[str]
    published_date: str
    last_modified: str
    cwe_ids: List[str]
    affected_products: List[str]
    references: List[str]
    exploitability_score: Optional[float]
    impact_score: Optional[float]
    is_kev: bool = False  # CISA Known Exploited Vulnerabilities
    
@dataclass
class DeviceVulnerability:
    """Device-specific vulnerability mapping"""
    device_ip: str
    device_name: str
    device_type: str
    cve_id: str
    severity: str
    score: float
    risk_level: str
    remediation_priority: int
    affected_services: List[str]
    detection_confidence: float

class CVEIntegration:
    """
    AI-Powered CVE Integration System
    
    Integrates with NIST NVD API to provide real-time vulnerability intelligence
    for network devices discovered by SecureNet.
    """
    
    def __init__(self, api_key: Optional[str] = None, db_path: str = "data/securenet.db"):
        self.api_key = api_key
        self.db_path = db_path
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.rate_limit_delay = 0.6 if api_key else 6.0  # API key allows faster requests
        self.last_request_time = 0
        
        # Device fingerprinting patterns for CVE mapping
        self.device_patterns = {
            'cisco': [
                r'cisco',
                r'ios',
                r'nx-os',
                r'asa',
                r'catalyst',
                r'nexus'
            ],
            'fortinet': [
                r'fortinet',
                r'fortigate',
                r'fortios',
                r'fortianalyzer',
                r'fortimanager'
            ],
            'palo_alto': [
                r'palo\s*alto',
                r'pan-os',
                r'panorama',
                r'globalprotect'
            ],
            'juniper': [
                r'juniper',
                r'junos',
                r'srx',
                r'mx\d+',
                r'ex\d+'
            ],
            'mikrotik': [
                r'mikrotik',
                r'routeros',
                r'routerboard'
            ],
            'ubiquiti': [
                r'ubiquiti',
                r'unifi',
                r'edgerouter',
                r'airmax'
            ]
        }
        
        # Initialize database tables
        self._init_cve_tables()
    
    def _init_cve_tables(self):
        """Initialize CVE-related database tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # CVE data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cve_data (
                    cve_id TEXT PRIMARY KEY,
                    description TEXT,
                    cvss_v3_score REAL,
                    cvss_v3_severity TEXT,
                    cvss_v3_vector TEXT,
                    published_date TEXT,
                    last_modified TEXT,
                    cwe_ids TEXT,
                    affected_products TEXT,
                    reference_urls TEXT,
                    exploitability_score REAL,
                    impact_score REAL,
                    is_kev BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Device vulnerabilities table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS device_vulnerabilities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    device_ip TEXT,
                    device_name TEXT,
                    device_type TEXT,
                    cve_id TEXT,
                    severity TEXT,
                    score REAL,
                    risk_level TEXT,
                    remediation_priority INTEGER,
                    affected_services TEXT,
                    detection_confidence REAL,
                    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cve_id) REFERENCES cve_data (cve_id)
                )
            """)
            
            # CVE scan history
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cve_scan_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_type TEXT,
                    devices_scanned INTEGER,
                    cves_found INTEGER,
                    high_risk_count INTEGER,
                    critical_count INTEGER,
                    scan_duration REAL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            conn.close()
            logger.info("CVE database tables initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize CVE tables: {e}")
    
    async def _rate_limit(self):
        """Implement rate limiting for API requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    async def _make_api_request(self, params: Dict) -> Optional[Dict]:
        """Make authenticated request to NVD API"""
        await self._rate_limit()
        
        headers = {
            'User-Agent': 'SecureNet-CVE-Integration/2.1.0'
        }
        
        if self.api_key:
            headers['apiKey'] = self.api_key
        
        url = f"{self.base_url}?{urlencode(params)}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 403:
                        logger.error("API key invalid or rate limit exceeded")
                        return None
                    else:
                        logger.error(f"API request failed: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"API request error: {e}")
            return None
    
    def _parse_cve_data(self, cve_item: Dict) -> CVEData:
        """Parse CVE data from NVD API response"""
        cve = cve_item.get('cve', {})
        
        # Extract basic info
        cve_id = cve.get('id', '')
        descriptions = cve.get('descriptions', [])
        description = descriptions[0].get('value', '') if descriptions else ''
        
        # Extract CVSS v3 metrics
        metrics = cve.get('metrics', {})
        cvss_v3 = None
        cvss_v3_score = None
        cvss_v3_severity = None
        cvss_v3_vector = None
        exploitability_score = None
        impact_score = None
        
        if 'cvssMetricV31' in metrics:
            cvss_v3 = metrics['cvssMetricV31'][0]['cvssData']
        elif 'cvssMetricV30' in metrics:
            cvss_v3 = metrics['cvssMetricV30'][0]['cvssData']
        
        if cvss_v3:
            cvss_v3_score = cvss_v3.get('baseScore')
            cvss_v3_severity = cvss_v3.get('baseSeverity')
            cvss_v3_vector = cvss_v3.get('vectorString')
            exploitability_score = cvss_v3.get('exploitabilityScore')
            impact_score = cvss_v3.get('impactScore')
        
        # Extract CWE IDs
        weaknesses = cve.get('weaknesses', [])
        cwe_ids = []
        for weakness in weaknesses:
            for desc in weakness.get('description', []):
                if desc.get('value', '').startswith('CWE-'):
                    cwe_ids.append(desc['value'])
        
        # Extract affected products from configurations
        affected_products = []
        configurations = cve.get('configurations', [])
        for config in configurations:
            for node in config.get('nodes', []):
                for cpe_match in node.get('cpeMatch', []):
                    criteria = cpe_match.get('criteria', '')
                    if criteria:
                        affected_products.append(criteria)
        
        # Extract references
        references = []
        for ref in cve.get('references', []):
            references.append(ref.get('url', ''))
        
        # Check if it's a CISA KEV
        is_kev = any('cisaExploitAdd' in str(cve_item) for _ in [1])
        
        return CVEData(
            cve_id=cve_id,
            description=description,
            cvss_v3_score=cvss_v3_score,
            cvss_v3_severity=cvss_v3_severity,
            cvss_v3_vector=cvss_v3_vector,
            published_date=cve.get('published', ''),
            last_modified=cve.get('lastModified', ''),
            cwe_ids=cwe_ids,
            affected_products=affected_products,
            references=references,
            exploitability_score=exploitability_score,
            impact_score=impact_score,
            is_kev=is_kev
        )
    
    async def search_cves_by_keyword(self, keyword: str, limit: int = 100) -> List[CVEData]:
        """Search CVEs by keyword (vendor, product, etc.)"""
        params = {
            'keywordSearch': keyword,
            'resultsPerPage': min(limit, 2000),
            'startIndex': 0
        }
        
        response = await self._make_api_request(params)
        if not response:
            return []
        
        cves = []
        for vulnerability in response.get('vulnerabilities', []):
            try:
                cve_data = self._parse_cve_data(vulnerability)
                cves.append(cve_data)
            except Exception as e:
                logger.error(f"Error parsing CVE data: {e}")
                continue
        
        return cves
    
    async def search_recent_cves(self, days: int = 30) -> List[CVEData]:
        """Search for CVEs published in the last N days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        params = {
            'pubStartDate': start_date.strftime('%Y-%m-%dT00:00:00.000'),
            'pubEndDate': end_date.strftime('%Y-%m-%dT23:59:59.999'),
            'resultsPerPage': 2000,
            'startIndex': 0
        }
        
        response = await self._make_api_request(params)
        if not response:
            return []
        
        cves = []
        for vulnerability in response.get('vulnerabilities', []):
            try:
                cve_data = self._parse_cve_data(vulnerability)
                cves.append(cve_data)
            except Exception as e:
                logger.error(f"Error parsing CVE data: {e}")
                continue
        
        return cves
    
    async def search_high_severity_cves(self, severity: str = "HIGH") -> List[CVEData]:
        """Search for high severity CVEs"""
        params = {
            'cvssV3Severity': severity,
            'resultsPerPage': 2000,
            'startIndex': 0
        }
        
        response = await self._make_api_request(params)
        if not response:
            return []
        
        cves = []
        for vulnerability in response.get('vulnerabilities', []):
            try:
                cve_data = self._parse_cve_data(vulnerability)
                cves.append(cve_data)
            except Exception as e:
                logger.error(f"Error parsing CVE data: {e}")
                continue
        
        return cves
    
    def _identify_device_vendor(self, device_info: Dict) -> Optional[str]:
        """Identify device vendor from device information"""
        device_name = device_info.get('name', '').lower()
        device_type = device_info.get('type', '').lower()
        
        # Combine all device info for pattern matching
        search_text = f"{device_name} {device_type}".lower()
        
        for vendor, patterns in self.device_patterns.items():
            for pattern in patterns:
                if re.search(pattern, search_text, re.IGNORECASE):
                    return vendor
        
        return None
    
    def _calculate_risk_level(self, cvss_score: Optional[float], is_kev: bool = False) -> Tuple[str, int]:
        """Calculate risk level and remediation priority"""
        if not cvss_score:
            return "UNKNOWN", 5
        
        # Adjust for CISA KEV (Known Exploited Vulnerabilities)
        priority_boost = -2 if is_kev else 0
        
        if cvss_score >= 9.0:
            return "CRITICAL", max(1, 1 + priority_boost)
        elif cvss_score >= 7.0:
            return "HIGH", max(2, 2 + priority_boost)
        elif cvss_score >= 4.0:
            return "MEDIUM", max(3, 3 + priority_boost)
        elif cvss_score >= 0.1:
            return "LOW", max(4, 4 + priority_boost)
        else:
            return "INFORMATIONAL", 5
    
    def _calculate_detection_confidence(self, device_info: Dict, cve_data: CVEData) -> float:
        """Calculate confidence level for CVE-device mapping"""
        confidence = 0.0
        
        device_name = device_info.get('name', '').lower()
        device_type = device_info.get('type', '').lower()
        
        # Check if device vendor matches CVE affected products
        vendor = self._identify_device_vendor(device_info)
        if vendor:
            for product in cve_data.affected_products:
                if vendor in product.lower():
                    confidence += 0.4
                    break
        
        # Check for specific product matches
        for product in cve_data.affected_products:
            product_lower = product.lower()
            if any(term in product_lower for term in [device_name, device_type]):
                confidence += 0.3
        
        # Boost confidence for network infrastructure devices
        if device_info.get('type', '').lower() in ['router', 'switch', 'firewall', 'access_point']:
            confidence += 0.2
        
        # Boost confidence for devices with open ports matching common services
        open_ports = device_info.get('open_ports', [])
        if any(port in [22, 23, 80, 443, 161, 8080, 8443] for port in open_ports):
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def analyze_device_vulnerabilities(self, device_info: Dict) -> List[DeviceVulnerability]:
        """Analyze vulnerabilities for a specific device"""
        vendor = self._identify_device_vendor(device_info)
        if not vendor:
            logger.warning(f"Could not identify vendor for device {device_info.get('ip')}")
            return []
        
        # Search for CVEs related to the device vendor
        cves = await self.search_cves_by_keyword(vendor)
        
        vulnerabilities = []
        for cve in cves:
            confidence = self._calculate_detection_confidence(device_info, cve)
            
            # Only include CVEs with reasonable confidence
            if confidence >= 0.3:
                risk_level, priority = self._calculate_risk_level(
                    cve.cvss_v3_score, 
                    cve.is_kev
                )
                
                # Identify affected services based on open ports
                affected_services = []
                open_ports = device_info.get('open_ports', [])
                service_map = {
                    22: 'SSH',
                    23: 'Telnet',
                    80: 'HTTP',
                    443: 'HTTPS',
                    161: 'SNMP',
                    8080: 'HTTP-Alt',
                    8443: 'HTTPS-Alt'
                }
                
                for port in open_ports:
                    if port in service_map:
                        affected_services.append(service_map[port])
                
                vulnerability = DeviceVulnerability(
                    device_ip=device_info.get('ip', ''),
                    device_name=device_info.get('name', ''),
                    device_type=device_info.get('type', ''),
                    cve_id=cve.cve_id,
                    severity=cve.cvss_v3_severity or 'UNKNOWN',
                    score=cve.cvss_v3_score or 0.0,
                    risk_level=risk_level,
                    remediation_priority=priority,
                    affected_services=affected_services,
                    detection_confidence=confidence
                )
                
                vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    def store_cve_data(self, cves: List[CVEData]):
        """Store CVE data in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for cve in cves:
                cursor.execute("""
                    INSERT OR REPLACE INTO cve_data (
                        cve_id, description, cvss_v3_score, cvss_v3_severity,
                        cvss_v3_vector, published_date, last_modified,
                        cwe_ids, affected_products, reference_urls,
                        exploitability_score, impact_score, is_kev
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    cve.cve_id,
                    cve.description,
                    cve.cvss_v3_score,
                    cve.cvss_v3_severity,
                    cve.cvss_v3_vector,
                    cve.published_date,
                    cve.last_modified,
                    json.dumps(cve.cwe_ids),
                    json.dumps(cve.affected_products),
                    json.dumps(cve.references),
                    cve.exploitability_score,
                    cve.impact_score,
                    cve.is_kev
                ))
            
            conn.commit()
            conn.close()
            logger.info(f"Stored {len(cves)} CVEs in database")
            
        except Exception as e:
            logger.error(f"Failed to store CVE data: {e}")
    
    def store_device_vulnerabilities(self, vulnerabilities: List[DeviceVulnerability]):
        """Store device vulnerabilities in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for vuln in vulnerabilities:
                cursor.execute("""
                    INSERT INTO device_vulnerabilities (
                        device_ip, device_name, device_type, cve_id,
                        severity, score, risk_level, remediation_priority,
                        affected_services, detection_confidence
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    vuln.device_ip,
                    vuln.device_name,
                    vuln.device_type,
                    vuln.cve_id,
                    vuln.severity,
                    vuln.score,
                    vuln.risk_level,
                    vuln.remediation_priority,
                    json.dumps(vuln.affected_services),
                    vuln.detection_confidence
                ))
            
            conn.commit()
            conn.close()
            logger.info(f"Stored {len(vulnerabilities)} device vulnerabilities")
            
        except Exception as e:
            logger.error(f"Failed to store device vulnerabilities: {e}")
    
    async def full_vulnerability_scan(self) -> Dict:
        """Perform comprehensive vulnerability scan of all network devices"""
        start_time = time.time()
        
        # Get all network devices from database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, type, status, last_seen, metadata 
            FROM network_devices 
            WHERE status = 'active'
        """)
        
        devices = []
        for row in cursor.fetchall():
            # Extract IP address from metadata if available
            metadata = json.loads(row[5]) if row[5] else {}
            ip_address = metadata.get('ip_address', f'192.168.2.{row[0]}')  # Fallback IP
            
            devices.append({
                'ip': ip_address,
                'name': row[1] or 'Unknown',
                'type': row[2] or 'Unknown',
                'open_ports': metadata.get('open_ports', [22, 80, 443])  # Default common ports
            })
        
        conn.close()
        
        if not devices:
            logger.warning("No active devices found for vulnerability scanning")
            return {
                'devices_scanned': 0,
                'vulnerabilities_found': 0,
                'high_risk_count': 0,
                'critical_count': 0,
                'scan_duration': 0
            }
        
        logger.info(f"Starting vulnerability scan for {len(devices)} devices")
        
        all_vulnerabilities = []
        high_risk_count = 0
        critical_count = 0
        
        # Analyze each device
        for device in devices:
            try:
                device_vulns = await self.analyze_device_vulnerabilities(device)
                all_vulnerabilities.extend(device_vulns)
                
                # Count risk levels
                for vuln in device_vulns:
                    if vuln.risk_level == 'HIGH':
                        high_risk_count += 1
                    elif vuln.risk_level == 'CRITICAL':
                        critical_count += 1
                
                logger.info(f"Found {len(device_vulns)} vulnerabilities for {device['ip']}")
                
            except Exception as e:
                logger.error(f"Error analyzing device {device['ip']}: {e}")
        
        # Store all vulnerabilities
        if all_vulnerabilities:
            # Clear old vulnerabilities for these devices
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            device_ips = [d['ip'] for d in devices]
            placeholders = ','.join(['?' for _ in device_ips])
            cursor.execute(f"DELETE FROM device_vulnerabilities WHERE device_ip IN ({placeholders})", device_ips)
            conn.commit()
            conn.close()
            
            # Store new vulnerabilities
            self.store_device_vulnerabilities(all_vulnerabilities)
        
        scan_duration = time.time() - start_time
        
        # Record scan history
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO cve_scan_history (
                    scan_type, devices_scanned, cves_found, 
                    high_risk_count, critical_count, scan_duration
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                'full_scan',
                len(devices),
                len(all_vulnerabilities),
                high_risk_count,
                critical_count,
                scan_duration
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to record scan history: {e}")
        
        results = {
            'devices_scanned': len(devices),
            'vulnerabilities_found': len(all_vulnerabilities),
            'high_risk_count': high_risk_count,
            'critical_count': critical_count,
            'scan_duration': scan_duration
        }
        
        logger.info(f"Vulnerability scan completed: {results}")
        return results
    
    def get_vulnerability_summary(self) -> Dict:
        """Get vulnerability summary statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get vulnerability counts by severity
            cursor.execute("""
                SELECT risk_level, COUNT(*) 
                FROM device_vulnerabilities 
                GROUP BY risk_level
            """)
            severity_counts = dict(cursor.fetchall())
            
            # Get top vulnerable devices
            cursor.execute("""
                SELECT device_ip, device_name, COUNT(*) as vuln_count
                FROM device_vulnerabilities 
                GROUP BY device_ip, device_name
                ORDER BY vuln_count DESC
                LIMIT 5
            """)
            top_devices = [
                {'ip': row[0], 'name': row[1], 'count': row[2]}
                for row in cursor.fetchall()
            ]
            
            # Get recent scan info
            cursor.execute("""
                SELECT * FROM cve_scan_history 
                ORDER BY timestamp DESC 
                LIMIT 1
            """)
            last_scan = cursor.fetchone()
            
            conn.close()
            
            return {
                'severity_counts': severity_counts,
                'top_vulnerable_devices': top_devices,
                'last_scan': {
                    'timestamp': last_scan[7] if last_scan else None,
                    'devices_scanned': last_scan[2] if last_scan else 0,
                    'vulnerabilities_found': last_scan[3] if last_scan else 0,
                    'duration': last_scan[6] if last_scan else 0
                } if last_scan else None,
                'total_vulnerabilities': sum(severity_counts.values())
            }
            
        except Exception as e:
            logger.error(f"Failed to get vulnerability summary: {e}")
            return {}

# Example usage and testing
async def main():
    """Example usage of CVE integration"""
    # Initialize CVE integration (add your NVD API key for faster requests)
    cve_integration = CVEIntegration(api_key=None)  # Add API key here
    
    # Search for recent Cisco CVEs
    print("Searching for recent Cisco CVEs...")
    cisco_cves = await cve_integration.search_cves_by_keyword("Cisco", limit=10)
    print(f"Found {len(cisco_cves)} Cisco CVEs")
    
    for cve in cisco_cves[:3]:  # Show first 3
        print(f"\n{cve.cve_id}: {cve.cvss_v3_severity} ({cve.cvss_v3_score})")
        print(f"Description: {cve.description[:100]}...")
    
    # Store CVEs in database
    if cisco_cves:
        cve_integration.store_cve_data(cisco_cves)
    
    # Perform full vulnerability scan
    print("\nPerforming full vulnerability scan...")
    scan_results = await cve_integration.full_vulnerability_scan()
    print(f"Scan Results: {scan_results}")
    
    # Get vulnerability summary
    summary = cve_integration.get_vulnerability_summary()
    print(f"\nVulnerability Summary: {summary}")

if __name__ == "__main__":
    asyncio.run(main()) 