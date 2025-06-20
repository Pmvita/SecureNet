#!/usr/bin/env python3
"""
Week 5 Day 1: Advanced Permission Management System
SecureNet Production Launch - Advanced User Management Features

This script implements a comprehensive advanced permission management system with
granular permission inheritance, custom role creation, and role hierarchy management.

Features:
- Granular permission inheritance system
- Custom role creation and management
- Permission conflict resolution
- Role hierarchy with cascading permissions
- Fine-grained access control
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum
import uuid

class PermissionType(Enum):
    """Types of permissions in the system"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"
    CREATE = "create"
    UPDATE = "update"

class ResourceType(Enum):
    """Types of resources that can have permissions"""
    DASHBOARD = "dashboard"
    NETWORK = "network"
    SECURITY = "security"
    USERS = "users"
    SETTINGS = "settings"
    LOGS = "logs"
    REPORTS = "reports"
    ALERTS = "alerts"
    ANOMALIES = "anomalies"
    SYSTEM = "system"

class PermissionEffect(Enum):
    """Effect of a permission rule"""
    ALLOW = "allow"
    DENY = "deny"

@dataclass
class Permission:
    """Represents a single permission"""
    id: Optional[int]
    name: str
    resource_type: ResourceType
    permission_type: PermissionType
    resource_id: Optional[str]
    description: str
    is_system: bool
    created_at: datetime

@dataclass
class Role:
    """Represents a role with permissions"""
    id: Optional[int]
    name: str
    description: str
    parent_role_id: Optional[int]
    is_system: bool
    is_active: bool
    permissions: List[Permission]
    created_at: datetime
    updated_at: datetime

@dataclass
class PermissionRule:
    """Represents a permission rule with effect and conditions"""
    id: Optional[int]
    role_id: int
    permission_id: int
    effect: PermissionEffect
    conditions: Dict[str, Any]
    priority: int
    is_active: bool
    created_at: datetime

class AdvancedPermissionManager:
    """
    Comprehensive advanced permission management system for SecureNet.
    
    Handles granular permission inheritance, custom role creation,
    permission conflict resolution, and role hierarchy management.
    """
    
    def __init__(self, db_path: str = "data/securenet.db"):
        self.db_path = db_path
        self.logger = self._setup_logging()
        self._init_database()
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for the permission manager"""
        logger = logging.getLogger('AdvancedPermissions')
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _init_database(self):
        """Initialize database tables for advanced permission management"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create permissions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                resource_type TEXT NOT NULL,
                permission_type TEXT NOT NULL,
                resource_id TEXT,
                description TEXT,
                is_system BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create roles table (enhanced)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                parent_role_id INTEGER,
                is_system BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_role_id) REFERENCES roles(id)
            )
        """)
        
        # Create permission rules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS permission_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                effect TEXT NOT NULL DEFAULT 'allow',
                conditions TEXT,
                priority INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles(id),
                FOREIGN KEY (permission_id) REFERENCES permissions(id)
            )
        """)
        
        # Create role hierarchy table for complex relationships
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS role_hierarchy (
                parent_role_id INTEGER,
                child_role_id INTEGER,
                inheritance_level INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (parent_role_id, child_role_id),
                FOREIGN KEY (parent_role_id) REFERENCES roles(id),
                FOREIGN KEY (child_role_id) REFERENCES roles(id)
            )
        """)
        
        # Create user role assignments table (enhanced)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_role_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                role_id INTEGER NOT NULL,
                assigned_by INTEGER,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                conditions TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (role_id) REFERENCES roles(id),
                FOREIGN KEY (assigned_by) REFERENCES users(id)
            )
        """)
        
        # Create permission audit log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS permission_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                role_id INTEGER,
                permission_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                result TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()
        self.logger.info("Advanced permission management database schema initialized")
    
    def create_permission(self, name: str, resource_type: ResourceType, 
                         permission_type: PermissionType, description: str = "",
                         resource_id: Optional[str] = None, is_system: bool = False) -> int:
        """Create a new permission"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO permissions 
            (name, resource_type, permission_type, resource_id, description, is_system)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, resource_type.value, permission_type.value, resource_id, description, is_system))
        
        permission_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        self.logger.info(f"Created permission {permission_id}: {name}")
        return permission_id
    
    def create_role(self, name: str, description: str = "", 
                   parent_role_id: Optional[int] = None, is_system: bool = False) -> int:
        """Create a new role"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO roles (name, description, parent_role_id, is_system)
            VALUES (?, ?, ?, ?)
        """, (name, description, parent_role_id, is_system))
        
        role_id = cursor.lastrowid
        
        # Create hierarchy relationship if parent exists
        if parent_role_id:
            cursor.execute("""
                INSERT INTO role_hierarchy (parent_role_id, child_role_id)
                VALUES (?, ?)
            """, (parent_role_id, role_id))
        
        conn.commit()
        conn.close()
        
        self.logger.info(f"Created role {role_id}: {name}")
        return role_id
    
    def create_permission_rule(self, role_id: int, permission_id: int, 
                              effect: PermissionEffect = PermissionEffect.ALLOW,
                              conditions: Optional[Dict[str, Any]] = None,
                              priority: int = 0) -> int:
        """Create a permission rule for a role"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        conditions_json = json.dumps(conditions) if conditions else None
        
        cursor.execute("""
            INSERT INTO permission_rules 
            (role_id, permission_id, effect, conditions, priority)
            VALUES (?, ?, ?, ?, ?)
        """, (role_id, permission_id, effect.value, conditions_json, priority))
        
        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        self.logger.info(f"Created permission rule {rule_id} for role {role_id}")
        return rule_id
    
    def assign_role_to_user(self, user_id: int, role_id: int, assigned_by: int,
                           expires_at: Optional[datetime] = None,
                           conditions: Optional[Dict[str, Any]] = None) -> int:
        """Assign a role to a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        expires_str = expires_at.isoformat() if expires_at else None
        conditions_json = json.dumps(conditions) if conditions else None
        
        cursor.execute("""
            INSERT INTO user_role_assignments 
            (user_id, role_id, assigned_by, expires_at, conditions)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, role_id, assigned_by, expires_str, conditions_json))
        
        assignment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        self.logger.info(f"Assigned role {role_id} to user {user_id}")
        return assignment_id
    
    def get_role_hierarchy(self, role_id: int) -> List[int]:
        """Get the complete role hierarchy for a role (including inherited roles)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all parent roles recursively
        hierarchy = []
        current_roles = [role_id]
        visited = set()
        
        while current_roles:
            role = current_roles.pop(0)
            if role in visited:
                continue
            
            visited.add(role)
            hierarchy.append(role)
            
            # Get parent roles
            cursor.execute("""
                SELECT parent_role_id FROM role_hierarchy 
                WHERE child_role_id = ? AND is_active = 1
            """, (role,))
            
            parents = [row[0] for row in cursor.fetchall()]
            current_roles.extend(parents)
            
            # Also check direct parent relationship
            cursor.execute("""
                SELECT parent_role_id FROM roles 
                WHERE id = ? AND parent_role_id IS NOT NULL
            """, (role,))
            
            direct_parent = cursor.fetchone()
            if direct_parent and direct_parent[0] not in visited:
                current_roles.append(direct_parent[0])
        
        conn.close()
        return hierarchy
    
    def get_user_roles(self, user_id: int) -> List[int]:
        """Get all active roles for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # First try to get from role assignments table
        cursor.execute("""
            SELECT role_id FROM user_role_assignments 
            WHERE user_id = ? AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (user_id,))
        
        roles = [row[0] for row in cursor.fetchall()]
        
        # If no roles found, try to map from user.role to system roles
        if not roles:
            cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
            user_role_result = cursor.fetchone()
            if user_role_result:
                user_role = user_role_result[0]
                
                # Map legacy roles to new system roles
                role_mapping = {
                    'platform_owner': 'Platform Owner',
                    'security_admin': 'Security Admin', 
                    'soc_analyst': 'SOC Analyst',
                    'network_admin': 'Network Admin'
                }
                
                mapped_role_name = role_mapping.get(user_role, 'SOC Analyst')
                cursor.execute("SELECT id FROM roles WHERE name = ?", (mapped_role_name,))
                role_result = cursor.fetchone()
                if role_result:
                    roles = [role_result[0]]
        
        conn.close()
        return roles
    
    def get_effective_permissions(self, user_id: int) -> Dict[str, Any]:
        """Get all effective permissions for a user considering role hierarchy"""
        user_roles = self.get_user_roles(user_id)
        if not user_roles:
            return {}
        
        # Get all roles in hierarchy
        all_roles = set()
        for role_id in user_roles:
            hierarchy = self.get_role_hierarchy(role_id)
            all_roles.update(hierarchy)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all permission rules for these roles
        role_placeholders = ','.join(['?'] * len(all_roles))
        cursor.execute(f"""
            SELECT pr.*, p.name as permission_name, p.resource_type, p.permission_type,
                   p.resource_id, r.name as role_name
            FROM permission_rules pr
            JOIN permissions p ON pr.permission_id = p.id
            JOIN roles r ON pr.role_id = r.id
            WHERE pr.role_id IN ({role_placeholders}) AND pr.is_active = 1
            ORDER BY pr.priority DESC, pr.created_at ASC
        """, list(all_roles))
        
        rules = cursor.fetchall()
        conn.close()
        
        # Process rules with conflict resolution
        permissions = {}
        permission_details = {}
        
        for rule in rules:
            permission_key = f"{rule['resource_type']}.{rule['permission_type']}"
            if rule['resource_id']:
                permission_key += f".{rule['resource_id']}"
            
            # Higher priority rules override lower priority ones
            if permission_key not in permissions or rule['priority'] > permission_details[permission_key]['priority']:
                permissions[permission_key] = rule['effect'] == 'allow'
                permission_details[permission_key] = {
                    'permission_id': rule['permission_id'],
                    'permission_name': rule['permission_name'],
                    'role_name': rule['role_name'],
                    'effect': rule['effect'],
                    'priority': rule['priority'],
                    'conditions': json.loads(rule['conditions']) if rule['conditions'] else {},
                    'resource_type': rule['resource_type'],
                    'permission_type': rule['permission_type'],
                    'resource_id': rule['resource_id']
                }
        
        return {
            'permissions': permissions,
            'details': permission_details,
            'roles': list(all_roles),
            'user_roles': user_roles
        }
    
    def check_permission(self, user_id: int, resource_type: str, permission_type: str,
                        resource_id: Optional[str] = None, context: Optional[Dict[str, Any]] = None) -> bool:
        """Check if a user has a specific permission"""
        effective_permissions = self.get_effective_permissions(user_id)
        
        if not effective_permissions or 'permissions' not in effective_permissions:
            # Log denied access
            self._log_permission_check(user_id, resource_type, permission_type, resource_id, False, {})
            return False
        
        # Build permission key
        permission_key = f"{resource_type}.{permission_type}"
        if resource_id:
            permission_key += f".{resource_id}"
        
        # Check specific permission first
        if permission_key in effective_permissions['permissions']:
            permission_allowed = effective_permissions['permissions'][permission_key]
            
            # Check conditions if any
            if permission_allowed and 'details' in effective_permissions and permission_key in effective_permissions['details']:
                conditions = effective_permissions['details'][permission_key]['conditions']
                if conditions and not self._evaluate_conditions(conditions, context or {}):
                    permission_allowed = False
            
            # Log permission check
            details = effective_permissions.get('details', {}).get(permission_key, {})
            self._log_permission_check(
                user_id, resource_type, permission_type, resource_id, 
                permission_allowed, details
            )
            
            return permission_allowed
        
        # Check for wildcard permissions
        wildcard_key = f"{resource_type}.{permission_type}"
        if wildcard_key in effective_permissions['permissions']:
            return effective_permissions['permissions'][wildcard_key]
        
        # Check for admin permissions
        admin_key = f"{resource_type}.admin"
        if admin_key in effective_permissions['permissions']:
            return effective_permissions['permissions'][admin_key]
        
        # Check for system-wide admin
        if "system.admin" in effective_permissions['permissions']:
            return effective_permissions['permissions']['system.admin']
        
        # Log denied access
        self._log_permission_check(user_id, resource_type, permission_type, resource_id, False, {})
        
        return False
    
    def _evaluate_conditions(self, conditions: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Evaluate permission conditions against context"""
        for key, expected_value in conditions.items():
            context_value = context.get(key)
            
            if isinstance(expected_value, dict):
                # Handle complex conditions
                operator = expected_value.get('operator', 'equals')
                value = expected_value.get('value')
                
                if operator == 'equals' and context_value != value:
                    return False
                elif operator == 'not_equals' and context_value == value:
                    return False
                elif operator == 'in' and context_value not in value:
                    return False
                elif operator == 'not_in' and context_value in value:
                    return False
                elif operator == 'greater_than' and context_value <= value:
                    return False
                elif operator == 'less_than' and context_value >= value:
                    return False
            else:
                # Simple equality check
                if context_value != expected_value:
                    return False
        
        return True
    
    def _log_permission_check(self, user_id: int, resource_type: str, permission_type: str,
                             resource_id: Optional[str], result: bool, details: Dict[str, Any]):
        """Log permission checks for audit purposes"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO permission_audit 
            (user_id, action, resource_type, resource_id, result, details)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, f"check_{permission_type}", resource_type, resource_id, 
              'ALLOWED' if result else 'DENIED', json.dumps(details)))
        
        conn.commit()
        conn.close()
    
    def setup_default_permissions(self):
        """Setup default permissions and roles for SecureNet"""
        
        # Create system permissions
        permissions = [
            # Dashboard permissions
            ("dashboard.read", ResourceType.DASHBOARD, PermissionType.READ, "View dashboard"),
            ("dashboard.admin", ResourceType.DASHBOARD, PermissionType.ADMIN, "Administer dashboard"),
            
            # Network permissions
            ("network.read", ResourceType.NETWORK, PermissionType.READ, "View network data"),
            ("network.write", ResourceType.NETWORK, PermissionType.WRITE, "Modify network settings"),
            ("network.admin", ResourceType.NETWORK, PermissionType.ADMIN, "Administer network"),
            
            # Security permissions
            ("security.read", ResourceType.SECURITY, PermissionType.READ, "View security data"),
            ("security.write", ResourceType.SECURITY, PermissionType.WRITE, "Modify security settings"),
            ("security.admin", ResourceType.SECURITY, PermissionType.ADMIN, "Administer security"),
            
            # User management permissions
            ("users.read", ResourceType.USERS, PermissionType.READ, "View users"),
            ("users.create", ResourceType.USERS, PermissionType.CREATE, "Create users"),
            ("users.update", ResourceType.USERS, PermissionType.UPDATE, "Update users"),
            ("users.delete", ResourceType.USERS, PermissionType.DELETE, "Delete users"),
            ("users.admin", ResourceType.USERS, PermissionType.ADMIN, "Administer users"),
            
            # System permissions
            ("system.admin", ResourceType.SYSTEM, PermissionType.ADMIN, "System administration"),
            ("system.read", ResourceType.SYSTEM, PermissionType.READ, "View system information"),
            
            # Reports and logs
            ("reports.read", ResourceType.REPORTS, PermissionType.READ, "View reports"),
            ("reports.create", ResourceType.REPORTS, PermissionType.CREATE, "Create reports"),
            ("logs.read", ResourceType.LOGS, PermissionType.READ, "View logs"),
            ("alerts.read", ResourceType.ALERTS, PermissionType.READ, "View alerts"),
            ("alerts.write", ResourceType.ALERTS, PermissionType.WRITE, "Manage alerts"),
        ]
        
        permission_ids = {}
        for name, resource_type, permission_type, description in permissions:
            try:
                pid = self.create_permission(name, resource_type, permission_type, description, is_system=True)
                permission_ids[name] = pid
            except Exception as e:
                self.logger.warning(f"Permission {name} might already exist: {e}")
                # Get existing permission ID
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM permissions WHERE name = ?", (name,))
                existing = cursor.fetchone()
                if existing:
                    permission_ids[name] = existing[0]
                conn.close()
        
        # Create system roles with hierarchy
        roles = [
            ("Platform Owner", "Full platform access and control", None),
            ("Security Admin", "Security administration access", None),
            ("SOC Analyst", "Security operations center analyst", None),
            ("Network Admin", "Network administration access", None),
            ("Report Viewer", "Read-only report access", None),
        ]
        
        role_ids = {}
        for name, description, parent in roles:
            try:
                rid = self.create_role(name, description, parent, is_system=True)
                role_ids[name] = rid
            except Exception as e:
                self.logger.warning(f"Role {name} might already exist: {e}")
                # Get existing role ID
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM roles WHERE name = ?", (name,))
                existing = cursor.fetchone()
                if existing:
                    role_ids[name] = existing[0]
                conn.close()
        
        # Assign permissions to roles
        role_permissions = {
            "Platform Owner": [
                "system.admin", "users.admin", "security.admin", "network.admin",
                "dashboard.admin", "reports.create", "logs.read", "alerts.write"
            ],
            "Security Admin": [
                "security.admin", "security.read", "security.write", "users.read",
                "users.update", "dashboard.read", "reports.read", "alerts.write",
                "logs.read"
            ],
            "SOC Analyst": [
                "security.read", "dashboard.read", "alerts.read", "logs.read",
                "reports.read", "network.read"
            ],
            "Network Admin": [
                "network.admin", "network.read", "network.write", "dashboard.read",
                "reports.read", "alerts.read"
            ],
            "Report Viewer": [
                "reports.read", "dashboard.read"
            ]
        }
        
        rules_created = 0
        for role_name, permissions_list in role_permissions.items():
            if role_name not in role_ids:
                continue
                
            role_id = role_ids[role_name]
            for permission_name in permissions_list:
                if permission_name in permission_ids:
                    try:
                        self.create_permission_rule(role_id, permission_ids[permission_name])
                        rules_created += 1
                    except Exception as e:
                        self.logger.warning(f"Permission rule might already exist: {e}")
        
        self.logger.info(f"Setup complete: {len(permission_ids)} permissions, {len(role_ids)} roles, {rules_created} rules")
        return {
            'permissions': len(permission_ids),
            'roles': len(role_ids),
            'rules': rules_created
        }

def main():
    """Main function to demonstrate the advanced permission management system"""
    print("🚀 Week 5 Day 1: Advanced Permission Management System")
    print("=" * 60)
    
    manager = AdvancedPermissionManager()
    
    # Setup default permissions and roles
    print("\n📋 Setting up default permissions and roles...")
    setup_results = manager.setup_default_permissions()
    print(f"✅ Setup complete:")
    print(f"   - Permissions: {setup_results['permissions']}")
    print(f"   - Roles: {setup_results['roles']}")
    print(f"   - Permission Rules: {setup_results['rules']}")
    
    # Example: Check permissions for existing users
    print("\n🔍 Testing permission system...")
    
    # Get some test users
    conn = sqlite3.connect("data/securenet.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role FROM users LIMIT 3")
    test_users = cursor.fetchall()
    conn.close()
    
    for user_id, username, user_role in test_users:
        print(f"\n👤 User: {username} (ID: {user_id}, Role: {user_role})")
        
        # Test various permissions
        test_permissions = [
            ("dashboard", "read"),
            ("security", "admin"),
            ("users", "create"),
            ("system", "admin")
        ]
        
        for resource_type, permission_type in test_permissions:
            has_permission = manager.check_permission(user_id, resource_type, permission_type)
            status = "✅ ALLOWED" if has_permission else "❌ DENIED"
            print(f"   {resource_type}.{permission_type}: {status}")
    
    print("\n🎉 Advanced Permission Management System successfully implemented!")
    print("📋 Features delivered:")
    print("   ✅ Granular permission inheritance system")
    print("   ✅ Custom role creation and management")
    print("   ✅ Permission conflict resolution")
    print("   ✅ Role hierarchy with cascading permissions")
    print("   ✅ Fine-grained access control")
    print("   ✅ Comprehensive audit logging")

if __name__ == "__main__":
    main() 