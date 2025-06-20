#!/usr/bin/env python3
"""
Week 5 Day 1: Dynamic Group Assignment Rules Engine
SecureNet Production Launch - Advanced User Management Features

This script implements a comprehensive dynamic group assignment system that automatically
assigns users to groups based on configurable rules and user attributes.

Features:
- Rule-based automatic group assignment
- User attribute-based group membership evaluation
- Real-time rule evaluation and updates
- Comprehensive audit logging for compliance
- Support for complex conditional logic
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import re

class RuleOperator(Enum):
    """Supported operators for group assignment rules"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    REGEX_MATCH = "regex_match"
    IN_LIST = "in_list"
    NOT_IN_LIST = "not_in_list"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"

class RuleCondition(Enum):
    """Logical conditions for combining rules"""
    AND = "and"
    OR = "or"
    NOT = "not"

@dataclass
class GroupRule:
    """Represents a single group assignment rule"""
    id: Optional[int]
    group_id: int
    attribute_name: str
    operator: RuleOperator
    value: Any
    is_active: bool
    priority: int
    description: str
    created_at: datetime
    updated_at: datetime

@dataclass
class RuleSet:
    """Represents a collection of rules with logical conditions"""
    id: Optional[int]
    group_id: int
    name: str
    condition: RuleCondition
    rules: List[GroupRule]
    is_active: bool
    created_at: datetime

class DynamicGroupRulesEngine:
    """
    Comprehensive dynamic group assignment rules engine for SecureNet.
    
    Handles automatic user group assignment based on configurable rules
    that evaluate user attributes and organizational data.
    """
    
    def __init__(self, db_path: str = "data/securenet.db"):
        self.db_path = db_path
        self.logger = self._setup_logging()
        self._init_database()
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging for the rules engine"""
        logger = logging.getLogger('DynamicGroupRules')
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
        """Initialize database tables for dynamic group rules"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create group assignment rules table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_assignment_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                attribute_name TEXT NOT NULL,
                operator TEXT NOT NULL,
                value TEXT,
                is_active BOOLEAN DEFAULT 1,
                priority INTEGER DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES user_groups(id)
            )
        """)
        
        # Create rule sets table for complex logic
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_rule_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                condition TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (group_id) REFERENCES user_groups(id)
            )
        """)
        
        # Create rule set relationships table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rule_set_rules (
                rule_set_id INTEGER,
                rule_id INTEGER,
                PRIMARY KEY (rule_set_id, rule_id),
                FOREIGN KEY (rule_set_id) REFERENCES group_rule_sets(id),
                FOREIGN KEY (rule_id) REFERENCES group_assignment_rules(id)
            )
        """)
        
        # Create rule evaluation audit log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS group_rule_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                rule_id INTEGER,
                rule_set_id INTEGER,
                action TEXT NOT NULL,
                old_groups TEXT,
                new_groups TEXT,
                evaluation_result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()
        self.logger.info("Dynamic group rules database schema initialized")
    
    def create_rule(self, group_id: int, attribute_name: str, operator: RuleOperator, 
                   value: Any, description: str = "", priority: int = 0) -> int:
        """Create a new group assignment rule"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Convert value to JSON string for storage
        value_str = json.dumps(value) if value is not None else None
        
        cursor.execute("""
            INSERT INTO group_assignment_rules 
            (group_id, attribute_name, operator, value, description, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (group_id, attribute_name, operator.value, value_str, description, priority))
        
        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        self.logger.info(f"Created group assignment rule {rule_id} for group {group_id}")
        return rule_id
    
    def create_rule_set(self, group_id: int, name: str, condition: RuleCondition, 
                       rule_ids: List[int]) -> int:
        """Create a rule set with multiple rules and logical conditions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create rule set
        cursor.execute("""
            INSERT INTO group_rule_sets (group_id, name, condition)
            VALUES (?, ?, ?)
        """, (group_id, name, condition.value))
        
        rule_set_id = cursor.lastrowid
        
        # Associate rules with rule set
        for rule_id in rule_ids:
            cursor.execute("""
                INSERT INTO rule_set_rules (rule_set_id, rule_id)
                VALUES (?, ?)
            """, (rule_set_id, rule_id))
        
        conn.commit()
        conn.close()
        
        self.logger.info(f"Created rule set {rule_set_id} with {len(rule_ids)} rules")
        return rule_set_id
    
    def evaluate_rule(self, rule: GroupRule, user_attributes: Dict[str, Any]) -> bool:
        """Evaluate a single rule against user attributes"""
        attribute_value = user_attributes.get(rule.attribute_name)
        rule_value = json.loads(rule.value) if rule.value else None
        
        try:
            if rule.operator == RuleOperator.EQUALS:
                return attribute_value == rule_value
            elif rule.operator == RuleOperator.NOT_EQUALS:
                return attribute_value != rule_value
            elif rule.operator == RuleOperator.CONTAINS:
                return rule_value in str(attribute_value) if attribute_value else False
            elif rule.operator == RuleOperator.NOT_CONTAINS:
                return rule_value not in str(attribute_value) if attribute_value else True
            elif rule.operator == RuleOperator.STARTS_WITH:
                return str(attribute_value).startswith(rule_value) if attribute_value else False
            elif rule.operator == RuleOperator.ENDS_WITH:
                return str(attribute_value).endswith(rule_value) if attribute_value else False
            elif rule.operator == RuleOperator.REGEX_MATCH:
                return bool(re.match(rule_value, str(attribute_value))) if attribute_value else False
            elif rule.operator == RuleOperator.IN_LIST:
                return attribute_value in rule_value if isinstance(rule_value, list) else False
            elif rule.operator == RuleOperator.NOT_IN_LIST:
                return attribute_value not in rule_value if isinstance(rule_value, list) else True
            elif rule.operator == RuleOperator.GREATER_THAN:
                return float(attribute_value) > float(rule_value) if attribute_value and rule_value else False
            elif rule.operator == RuleOperator.LESS_THAN:
                return float(attribute_value) < float(rule_value) if attribute_value and rule_value else False
            elif rule.operator == RuleOperator.IS_NULL:
                return attribute_value is None
            elif rule.operator == RuleOperator.IS_NOT_NULL:
                return attribute_value is not None
            else:
                self.logger.warning(f"Unknown operator: {rule.operator}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error evaluating rule {rule.id}: {e}")
            return False
    
    def get_user_attributes(self, user_id: int) -> Dict[str, Any]:
        """Get comprehensive user attributes for rule evaluation"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get user basic info
        cursor.execute("""
            SELECT u.*, 
                   CASE WHEN u.account_expires_at IS NOT NULL AND u.account_expires_at < datetime('now') 
                        THEN 1 ELSE 0 END as is_expired,
                   julianday(u.account_expires_at) - julianday('now') as days_until_expiry
            FROM users u WHERE u.id = ?
        """, (user_id,))
        
        user = cursor.fetchone()
        if not user:
            conn.close()
            return {}
        
        # Get user groups
        cursor.execute("""
            SELECT ug.name, ug.group_type
            FROM user_group_memberships ugm
            JOIN user_groups ug ON ugm.group_id = ug.id
            WHERE ugm.user_id = ?
        """, (user_id,))
        
        groups = [row['name'] for row in cursor.fetchall()]
        
        # Get user organization info (if available)
        cursor.execute("""
            SELECT department, title
            FROM users WHERE id = ?
        """, (user_id,))
        
        org_info = cursor.fetchone()
        
        conn.close()
        
        # Build comprehensive attributes dictionary
        attributes = {
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'] if user['email'] else '',
            'role': user['role'],
            'is_active': bool(user['is_active']),
            'is_expired': bool(user['is_expired']),
            'days_until_expiry': user['days_until_expiry'] or 999,
            'account_type': user['account_type'] if user['account_type'] else 'permanent',
            'created_at': user['created_at'],
            'last_login': user['last_login'] if user['last_login'] else None,
            'current_groups': groups,
            'group_count': len(groups),
            'organization': 'SecureNet',  # Default organization
            'department': org_info['department'] if org_info and org_info['department'] else '',
            'position': org_info['title'] if org_info and org_info['title'] else '',
        }
        
        # Add email domain
        if attributes['email']:
            attributes['email_domain'] = attributes['email'].split('@')[-1]
        
        return attributes
    
    def evaluate_user_for_group(self, user_id: int, group_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Evaluate if a user should be in a specific group based on rules"""
        user_attributes = self.get_user_attributes(user_id)
        if not user_attributes:
            return False, {"error": "User not found"}
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all active rules for the group
        cursor.execute("""
            SELECT * FROM group_assignment_rules 
            WHERE group_id = ? AND is_active = 1
            ORDER BY priority DESC
        """, (group_id,))
        
        rules = []
        for row in cursor.fetchall():
            rule = GroupRule(
                id=row['id'],
                group_id=row['group_id'],
                attribute_name=row['attribute_name'],
                operator=RuleOperator(row['operator']),
                value=row['value'],
                is_active=bool(row['is_active']),
                priority=row['priority'],
                description=row['description'],
                created_at=datetime.fromisoformat(row['created_at']),
                updated_at=datetime.fromisoformat(row['updated_at'])
            )
            rules.append(rule)
        
        # Get rule sets for the group
        cursor.execute("""
            SELECT rs.*, GROUP_CONCAT(rsr.rule_id) as rule_ids
            FROM group_rule_sets rs
            LEFT JOIN rule_set_rules rsr ON rs.id = rsr.rule_set_id
            WHERE rs.group_id = ? AND rs.is_active = 1
            GROUP BY rs.id
        """, (group_id,))
        
        rule_sets = cursor.fetchall()
        conn.close()
        
        evaluation_results = {
            "user_id": user_id,
            "group_id": group_id,
            "user_attributes": user_attributes,
            "individual_rules": [],
            "rule_sets": [],
            "should_be_member": False,
            "reasons": []
        }
        
        # Evaluate individual rules
        for rule in rules:
            result = self.evaluate_rule(rule, user_attributes)
            evaluation_results["individual_rules"].append({
                "rule_id": rule.id,
                "description": rule.description,
                "result": result,
                "attribute": rule.attribute_name,
                "operator": rule.operator.value,
                "value": rule.value
            })
            
            if result:
                evaluation_results["should_be_member"] = True
                evaluation_results["reasons"].append(f"Rule {rule.id}: {rule.description}")
        
        # Evaluate rule sets
        for rule_set in rule_sets:
            if not rule_set['rule_ids']:
                continue
                
            rule_ids = [int(rid) for rid in rule_set['rule_ids'].split(',')]
            set_rules = [r for r in rules if r.id in rule_ids]
            
            set_results = []
            for rule in set_rules:
                result = self.evaluate_rule(rule, user_attributes)
                set_results.append(result)
            
            # Apply logical condition
            condition = RuleCondition(rule_set['condition'])
            if condition == RuleCondition.AND:
                set_result = all(set_results)
            elif condition == RuleCondition.OR:
                set_result = any(set_results)
            else:  # NOT condition
                set_result = not any(set_results)
            
            evaluation_results["rule_sets"].append({
                "rule_set_id": rule_set['id'],
                "name": rule_set['name'],
                "condition": condition.value,
                "result": set_result,
                "rule_results": set_results
            })
            
            if set_result:
                evaluation_results["should_be_member"] = True
                evaluation_results["reasons"].append(f"Rule Set: {rule_set['name']}")
        
        return evaluation_results["should_be_member"], evaluation_results
    
    def evaluate_all_users(self) -> Dict[str, Any]:
        """Evaluate all users against all group rules and return assignment changes"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("SELECT id FROM users WHERE is_active = 1")
        users = [row['id'] for row in cursor.fetchall()]
        
        # Get all groups with rules
        cursor.execute("""
            SELECT DISTINCT group_id FROM group_assignment_rules WHERE is_active = 1
            UNION
            SELECT DISTINCT group_id FROM group_rule_sets WHERE is_active = 1
        """)
        groups = [row['group_id'] for row in cursor.fetchall()]
        
        conn.close()
        
        results = {
            "total_users": len(users),
            "total_groups": len(groups),
            "assignments_to_add": [],
            "assignments_to_remove": [],
            "evaluation_details": []
        }
        
        for user_id in users:
            for group_id in groups:
                should_be_member, details = self.evaluate_user_for_group(user_id, group_id)
                
                # Check current membership
                current_member = self._is_user_in_group(user_id, group_id)
                
                if should_be_member and not current_member:
                    results["assignments_to_add"].append({
                        "user_id": user_id,
                        "group_id": group_id,
                        "reasons": details["reasons"]
                    })
                elif not should_be_member and current_member:
                    results["assignments_to_remove"].append({
                        "user_id": user_id,
                        "group_id": group_id,
                        "reasons": ["No longer matches group rules"]
                    })
                
                results["evaluation_details"].append(details)
        
        self.logger.info(f"Evaluated {len(users)} users against {len(groups)} groups")
        self.logger.info(f"Found {len(results['assignments_to_add'])} assignments to add")
        self.logger.info(f"Found {len(results['assignments_to_remove'])} assignments to remove")
        
        return results
    
    def _is_user_in_group(self, user_id: int, group_id: int) -> bool:
        """Check if user is currently in the group"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 1 FROM user_group_memberships 
            WHERE user_id = ? AND group_id = ?
        """, (user_id, group_id))
        
        result = cursor.fetchone() is not None
        conn.close()
        return result
    
    def apply_group_assignments(self, evaluation_results: Dict[str, Any]) -> Dict[str, int]:
        """Apply the group assignment changes from evaluation"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        added_count = 0
        removed_count = 0
        
        # Add new assignments
        for assignment in evaluation_results["assignments_to_add"]:
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO user_group_memberships (user_id, group_id, assigned_at)
                    VALUES (?, ?, ?)
                """, (assignment["user_id"], assignment["group_id"], datetime.now().isoformat()))
                
                if cursor.rowcount > 0:
                    added_count += 1
                    
                    # Log the assignment
                    self._log_rule_audit(
                        cursor, assignment["user_id"], None, None,
                        "AUTO_ASSIGNED", [], [assignment["group_id"]],
                        f"Assigned to group {assignment['group_id']}: {', '.join(assignment['reasons'])}"
                    )
                    
            except Exception as e:
                self.logger.error(f"Error adding user {assignment['user_id']} to group {assignment['group_id']}: {e}")
        
        # Remove old assignments
        for assignment in evaluation_results["assignments_to_remove"]:
            try:
                cursor.execute("""
                    DELETE FROM user_group_memberships 
                    WHERE user_id = ? AND group_id = ?
                """, (assignment["user_id"], assignment["group_id"]))
                
                if cursor.rowcount > 0:
                    removed_count += 1
                    
                    # Log the removal
                    self._log_rule_audit(
                        cursor, assignment["user_id"], None, None,
                        "AUTO_REMOVED", [assignment["group_id"]], [],
                        f"Removed from group {assignment['group_id']}: {', '.join(assignment['reasons'])}"
                    )
                    
            except Exception as e:
                self.logger.error(f"Error removing user {assignment['user_id']} from group {assignment['group_id']}: {e}")
        
        conn.commit()
        conn.close()
        
        self.logger.info(f"Applied group assignments: {added_count} added, {removed_count} removed")
        return {"added": added_count, "removed": removed_count}
    
    def _log_rule_audit(self, cursor, user_id: int, rule_id: Optional[int], 
                       rule_set_id: Optional[int], action: str, old_groups: List[int], 
                       new_groups: List[int], evaluation_result: str):
        """Log rule evaluation and assignment changes for audit purposes"""
        cursor.execute("""
            INSERT INTO group_rule_audit 
            (user_id, rule_id, rule_set_id, action, old_groups, new_groups, evaluation_result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, rule_id, rule_set_id, action, 
              json.dumps(old_groups), json.dumps(new_groups), evaluation_result))
    
    def setup_default_rules(self):
        """Setup default group assignment rules for SecureNet"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get group IDs
        cursor.execute("SELECT id, name FROM user_groups")
        groups = {row['name']: row['id'] for row in cursor.fetchall()}
        
        conn.close()
        
        default_rules = []
        
        # Sales Team Rules
        if 'Sales Team' in groups:
            default_rules.extend([
                (groups['Sales Team'], 'department', RuleOperator.EQUALS, 'Sales', 'Assign sales department users'),
                (groups['Sales Team'], 'position', RuleOperator.CONTAINS, 'Sales', 'Assign users with Sales in position'),
                (groups['Sales Team'], 'email_domain', RuleOperator.EQUALS, 'sales.securenet.com', 'Sales domain email'),
            ])
        
        # Engineering Team Rules
        if 'Engineering Team' in groups:
            default_rules.extend([
                (groups['Engineering Team'], 'department', RuleOperator.EQUALS, 'Engineering', 'Engineering department'),
                (groups['Engineering Team'], 'position', RuleOperator.IN_LIST, ['Developer', 'Engineer', 'Architect'], 'Engineering positions'),
                (groups['Engineering Team'], 'email_domain', RuleOperator.EQUALS, 'eng.securenet.com', 'Engineering domain'),
            ])
        
        # Customer Organizations Rules
        if 'Customer Security Teams' in groups:
            default_rules.extend([
                (groups['Customer Security Teams'], 'role', RuleOperator.EQUALS, 'soc_analyst', 'SOC analysts'),
                (groups['Customer Security Teams'], 'organization', RuleOperator.NOT_EQUALS, 'SecureNet', 'External customers'),
                (groups['Customer Security Teams'], 'department', RuleOperator.CONTAINS, 'Security', 'Security departments'),
            ])
        
        # Contractor Rules
        if 'Contractors (6-month)' in groups:
            default_rules.extend([
                (groups['Contractors (6-month)'], 'account_type', RuleOperator.EQUALS, 'contractor_6mo', '6-month contractors'),
                (groups['Contractors (6-month)'], 'days_until_expiry', RuleOperator.LESS_THAN, 180, 'Expiring within 6 months'),
            ])
        
        # Temporary Users Rules
        if 'Temporary Users (30-90 days)' in groups:
            default_rules.extend([
                (groups['Temporary Users (30-90 days)'], 'account_type', RuleOperator.IN_LIST, ['temp_30', 'temp_60', 'temp_90'], 'Temporary accounts'),
                (groups['Temporary Users (30-90 days)'], 'days_until_expiry', RuleOperator.LESS_THAN, 90, 'Expiring within 90 days'),
            ])
        
        # Create the rules
        created_rules = 0
        for group_id, attribute, operator, value, description in default_rules:
            try:
                rule_id = self.create_rule(group_id, attribute, operator, value, description)
                created_rules += 1
                self.logger.info(f"Created default rule {rule_id}: {description}")
            except Exception as e:
                self.logger.error(f"Error creating rule for {description}: {e}")
        
        self.logger.info(f"Created {created_rules} default group assignment rules")
        return created_rules

def main():
    """Main function to demonstrate the dynamic group rules engine"""
    print("🚀 Week 5 Day 1: Dynamic Group Assignment Rules Engine")
    print("=" * 60)
    
    engine = DynamicGroupRulesEngine()
    
    # Setup default rules
    print("\n📋 Setting up default group assignment rules...")
    rules_created = engine.setup_default_rules()
    print(f"✅ Created {rules_created} default rules")
    
    # Evaluate all users
    print("\n🔍 Evaluating all users against group rules...")
    evaluation_results = engine.evaluate_all_users()
    
    print(f"📊 Evaluation Summary:")
    print(f"   - Total Users: {evaluation_results['total_users']}")
    print(f"   - Total Groups with Rules: {evaluation_results['total_groups']}")
    print(f"   - Assignments to Add: {len(evaluation_results['assignments_to_add'])}")
    print(f"   - Assignments to Remove: {len(evaluation_results['assignments_to_remove'])}")
    
    # Apply assignments
    if evaluation_results['assignments_to_add'] or evaluation_results['assignments_to_remove']:
        print("\n✅ Applying group assignment changes...")
        changes = engine.apply_group_assignments(evaluation_results)
        print(f"   - Groups Added: {changes['added']}")
        print(f"   - Groups Removed: {changes['removed']}")
    else:
        print("\n✅ No group assignment changes needed")
    
    print("\n🎉 Dynamic Group Assignment Rules Engine successfully implemented!")
    print("📋 Features delivered:")
    print("   ✅ Rule-based automatic group assignment")
    print("   ✅ User attribute-based group membership evaluation")
    print("   ✅ Real-time rule evaluation and updates")
    print("   ✅ Comprehensive audit logging for compliance")
    print("   ✅ Support for complex conditional logic")

if __name__ == "__main__":
    main() 