#!/usr/bin/env python3
"""
Week 4 Day 4: Enterprise User Groups CRUD API
SecureNet Production Launch - User Groups Management Backend
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

@dataclass
class UserGroup:
    """User Group data model"""
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    group_type: str = 'custom'
    permissions: Dict[str, Any] = None
    access_level: str = 'business'
    is_active: bool = True
    is_system_group: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = {}

class UserGroupsService:
    """Service class for user groups operations"""
    
    def __init__(self, db_path: str = "data/securenet.db"):
        self.db_path = db_path
    
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def list_user_groups(self, organization_id: str, filters: Dict[str, Any] = None) -> List[UserGroup]:
        """List user groups with optional filters"""
        conn = self.get_db_connection()
        try:
            cursor = conn.cursor()
            
            query = "SELECT * FROM user_groups WHERE organization_id = ?"
            params = [organization_id]
            
            if filters:
                if filters.get('group_type'):
                    query += " AND group_type = ?"
                    params.append(filters['group_type'])
                if filters.get('access_level'):
                    query += " AND access_level = ?"
                    params.append(filters['access_level'])
                if filters.get('is_active') is not None:
                    query += " AND is_active = ?"
                    params.append(filters['is_active'])
            
            query += " ORDER BY name"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            groups = []
            for row in rows:
                permissions = json.loads(row['permissions']) if row['permissions'] else {}
                groups.append(UserGroup(
                    id=row['id'],
                    organization_id=row['organization_id'],
                    name=row['name'],
                    description=row['description'],
                    group_type=row['group_type'],
                    permissions=permissions,
                    access_level=row['access_level'],
                    is_active=bool(row['is_active']),
                    is_system_group=bool(row['is_system_group']),
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                ))
            
            return groups
            
        finally:
            conn.close()

# Initialize service
user_groups_service = UserGroupsService()

# Authentication decorator (simplified)
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# API Routes
@app.route('/api/user-groups', methods=['GET'])
@require_auth
def list_user_groups():
    """List user groups with optional filters"""
    try:
        organization_id = request.args.get('organization_id')
        if not organization_id:
            return jsonify({'error': 'organization_id is required'}), 400
        
        filters = {}
        if request.args.get('group_type'):
            filters['group_type'] = request.args.get('group_type')
        if request.args.get('access_level'):
            filters['access_level'] = request.args.get('access_level')
        if request.args.get('is_active'):
            filters['is_active'] = request.args.get('is_active').lower() == 'true'
        
        groups = user_groups_service.list_user_groups(organization_id, filters)
        return jsonify({
            'groups': [asdict(group) for group in groups],
            'total': len(groups)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user-groups/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'user-groups-api',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('USER_GROUPS_API_PORT', 5001)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
