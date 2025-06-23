import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button/Button';
import { Card } from '../../components/common/Card/Card';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Badge } from '../../components/common/Badge/Badge';
import { Tabs } from '../../components/common/Tabs/Tabs';
import { Checkbox } from '../../components/common/Checkbox/Checkbox';

interface Permission {
  id: number;
  name: string;
  resource_type: string;
  permission_type: string;
  resource_id?: string;
  description: string;
  is_system: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
  parent_role_id?: number;
  is_system: boolean;
  is_active: boolean;
  permissions: Permission[];
  children_roles: Role[];
}

interface PermissionRule {
  id: number;
  role_id: number;
  permission_id: number;
  effect: 'allow' | 'deny';
  conditions: any;
  priority: number;
  is_active: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  roles: Role[];
  effective_permissions: Record<string, boolean>;
}

interface PermissionConflict {
  permission_key: string;
  roles: { role_name: string; effect: string; priority: number }[];
  resolution: string;
  severity: 'high' | 'medium' | 'low';
}

const AdvancedPermissionsDashboard: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionConflicts, setPermissionConflicts] = useState<PermissionConflict[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    parent_role_id: null as number | null
  });

  const [newPermission, setNewPermission] = useState({
    name: '',
    resource_type: '',
    permission_type: '',
    description: ''
  });

  const [bulkAssignment, setBulkAssignment] = useState({
    role_ids: [] as number[],
    permission_ids: [] as number[],
    effect: 'allow' as 'allow' | 'deny',
    priority: 0
  });

  const resourceTypes = [
    'dashboard', 'network', 'security', 'users', 'settings', 
    'logs', 'reports', 'alerts', 'anomalies', 'system'
  ];

  const permissionTypes = [
    'read', 'write', 'delete', 'execute', 'admin', 'create', 'update'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        loadRoles(),
        loadPermissions(),
        loadUsers(),
        loadPermissionConflicts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/roles');
      const data = await response.json();
      setRoles(data.roles || []);
      if (data.roles?.length > 0) {
        setSelectedRole(data.roles[0]);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/permissions');
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPermissionConflicts = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/permissions/conflicts');
      const data = await response.json();
      setPermissionConflicts(data.conflicts || []);
    } catch (error) {
      console.error('Error loading permission conflicts:', error);
    }
  };

  const createRole = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole)
      });

      if (response.ok) {
        setIsRoleModalOpen(false);
        setNewRole({ name: '', description: '', parent_role_id: null });
        loadRoles();
      }
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const createPermission = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission)
      });

      if (response.ok) {
        setIsPermissionModalOpen(false);
        setNewPermission({ name: '', resource_type: '', permission_type: '', description: '' });
        loadPermissions();
      }
    } catch (error) {
      console.error('Error creating permission:', error);
    }
  };

  const bulkAssignPermissions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/permissions/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkAssignment)
      });

      if (response.ok) {
        setIsBulkAssignOpen(false);
        setBulkAssignment({ role_ids: [], permission_ids: [], effect: 'allow', priority: 0 });
        loadRoles();
        loadPermissionConflicts();
      }
    } catch (error) {
      console.error('Error bulk assigning permissions:', error);
    }
  };

  const togglePermissionForRole = async (roleId: number, permissionId: number, currentlyHas: boolean) => {
    try {
      if (currentlyHas) {
        await fetch(`http://127.0.0.1:8000/api/admin/roles/${roleId}/permissions/${permissionId}`, {
          method: 'DELETE'
        });
      } else {
        await fetch(`http://127.0.0.1:8000/api/admin/roles/${roleId}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission_id: permissionId, effect: 'allow' })
        });
      }
      loadRoles();
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const renderRoleHierarchy = () => {
    const buildHierarchy = (roles: Role[], parentId: number | null = null): Role[] => {
      return roles.filter(role => role.parent_role_id === parentId);
    };

    const renderRoleNode = (role: Role, level: number = 0) => (
      <div key={role.id} className={`ml-${level * 4}`}>
        <Card 
          className={`p-3 mb-2 cursor-pointer transition-colors ${
            selectedRole?.id === role.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
          }`}
          onClick={() => setSelectedRole(role)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{role.name}</span>
              <Badge variant={role.is_active ? 'success' : 'secondary'}>
                {role.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {role.is_system && (
                <Badge variant="outline">System</Badge>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {role.permissions.length} permissions
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{role.description}</p>
        </Card>
        {role.children_roles.map(child => renderRoleNode(child, level + 1))}
      </div>
    );

    const rootRoles = buildHierarchy(roles);
    return (
      <div className="space-y-2">
        {rootRoles.map(role => renderRoleNode(role))}
      </div>
    );
  };

  const renderPermissionMatrix = () => {
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource_type]) {
        acc[permission.resource_type] = [];
      }
      acc[permission.resource_type].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return (
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([resourceType, resourcePermissions]) => (
          <Card key={resourceType} className="p-4">
            <h3 className="font-medium text-gray-900 mb-4 capitalize">
              {resourceType} Permissions
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-700">Permission</th>
                    {roles.slice(0, 6).map(role => (
                      <th key={role.id} className="text-center p-2 font-medium text-gray-700 min-w-[100px]">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resourcePermissions.map(permission => (
                    <tr key={permission.id} className="border-t border-gray-200">
                      <td className="p-2">
                        <div>
                          <div className="font-medium text-sm">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        </div>
                      </td>
                      {roles.slice(0, 6).map(role => {
                        const hasPermission = role.permissions.some(p => p.id === permission.id);
                        return (
                          <td key={`${role.id}-${permission.id}`} className="p-2 text-center">
                            <Checkbox
                              checked={hasPermission}
                              onChange={() => togglePermissionForRole(role.id, permission.id, hasPermission)}
                              disabled={role.is_system}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderPermissionConflicts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Permission Conflicts</h3>
        <Button onClick={loadPermissionConflicts} size="sm">
          Refresh
        </Button>
      </div>

      {permissionConflicts.map((conflict, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">{conflict.permission_key}</h4>
                <Badge variant={
                  conflict.severity === 'high' ? 'destructive' : 
                  conflict.severity === 'medium' ? 'warning' : 'secondary'
                }>
                  {conflict.severity} priority
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Conflicting roles:</p>
                <div className="space-y-1">
                  {conflict.roles.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{role.role_name}:</span>
                      <Badge variant={role.effect === 'allow' ? 'success' : 'destructive'}>
                        {role.effect}
                      </Badge>
                      <span className="text-gray-500">Priority: {role.priority}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mt-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Resolution:</strong> {conflict.resolution}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {permissionConflicts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No permission conflicts detected. Your role hierarchy is clean!
        </div>
      )}
    </div>
  );

  const renderUserPermissions = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          <Select
            value={selectedUser?.id.toString() || ''}
            onChange={(value) => {
              const user = users.find(u => u.id === parseInt(value));
              setSelectedUser(user || null);
            }}
            options={users.map(user => ({
              value: user.id.toString(),
              label: `${user.username} (${user.email})`
            }))}
            placeholder="Select a user"
          />
        </div>
      </div>

      {selectedUser && (
        <Card className="p-4">
          <div className="mb-4">
            <h3 className="font-medium text-gray-900">{selectedUser.username}</h3>
            <p className="text-sm text-gray-600">{selectedUser.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Primary Role: {selectedUser.role}</Badge>
              <Badge variant="secondary">{selectedUser.roles.length} total roles</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Assigned Roles</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.roles.map(role => (
                  <Badge key={role.id} variant="outline">
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Effective Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(selectedUser.effective_permissions).map(([permission, allowed]) => (
                  <div key={permission} className="flex items-center gap-2 text-sm">
                    <Badge variant={allowed ? 'success' : 'destructive'} size="sm">
                      {allowed ? '✓' : '✗'}
                    </Badge>
                    <span>{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const tabs = [
    {
      id: 'hierarchy',
      label: 'Role Hierarchy',
      content: (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Role Hierarchy</h3>
            <Button onClick={() => setIsRoleModalOpen(true)}>
              Create Role
            </Button>
          </div>
          {renderRoleHierarchy()}
        </div>
      )
    },
    {
      id: 'matrix',
      label: 'Permission Matrix',
      content: (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Permission Matrix</h3>
            <div className="flex gap-2">
              <Button onClick={() => setIsPermissionModalOpen(true)} variant="secondary">
                Create Permission
              </Button>
              <Button onClick={() => setIsBulkAssignOpen(true)}>
                Bulk Assign
              </Button>
            </div>
          </div>
          {renderPermissionMatrix()}
        </div>
      )
    },
    {
      id: 'conflicts',
      label: 'Conflicts',
      content: renderPermissionConflicts()
    },
    {
      id: 'users',
      label: 'User Permissions',
      content: renderUserPermissions()
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Permissions Management</h1>
          <p className="text-gray-600 mt-1">
            Manage roles, permissions, and access control with advanced hierarchy and conflict resolution
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{roles.length}</div>
          <div className="text-sm text-gray-600">Total Roles</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{permissions.length}</div>
          <div className="text-sm text-gray-600">Total Permissions</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{users.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{permissionConflicts.length}</div>
          <div className="text-sm text-gray-600">Conflicts</div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        <Tabs tabs={tabs} defaultTab="hierarchy" />
      </Card>

      {/* Create Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Create New Role"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role Name
            </label>
            <Input
              type="text"
              value={newRole.name}
              onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter role name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Input
              type="text"
              value={newRole.description}
              onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter role description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parent Role (Optional)
            </label>
            <Select
              value={newRole.parent_role_id?.toString() || ''}
              onChange={(value) => setNewRole(prev => ({ 
                ...prev, 
                parent_role_id: value ? parseInt(value) : null 
              }))}
              options={[
                { value: '', label: 'No parent role' },
                ...roles.map(role => ({
                  value: role.id.toString(),
                  label: role.name
                }))
              ]}
              placeholder="Select parent role"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createRole}>
              Create Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Permission Modal */}
      <Modal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        title="Create New Permission"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <Select
                value={newPermission.resource_type}
                onChange={(value) => setNewPermission(prev => ({ ...prev, resource_type: value }))}
                options={resourceTypes.map(type => ({ value: type, label: type }))}
                placeholder="Select resource type"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Type
              </label>
              <Select
                value={newPermission.permission_type}
                onChange={(value) => setNewPermission(prev => ({ ...prev, permission_type: value }))}
                options={permissionTypes.map(type => ({ value: type, label: type }))}
                placeholder="Select permission type"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Name
            </label>
            <Input
              type="text"
              value={newPermission.name}
              onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., dashboard.read"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Input
              type="text"
              value={newPermission.description}
              onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this permission allows"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsPermissionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPermission}>
              Create Permission
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Assignment Modal */}
      <Modal
        isOpen={isBulkAssignOpen}
        onClose={() => setIsBulkAssignOpen(false)}
        title="Bulk Permission Assignment"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Roles
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {roles.map(role => (
                <label key={role.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bulkAssignment.role_ids.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkAssignment(prev => ({
                          ...prev,
                          role_ids: [...prev.role_ids, role.id]
                        }));
                      } else {
                        setBulkAssignment(prev => ({
                          ...prev,
                          role_ids: prev.role_ids.filter(id => id !== role.id)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Permissions
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {permissions.map(permission => (
                <label key={permission.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={bulkAssignment.permission_ids.includes(permission.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkAssignment(prev => ({
                          ...prev,
                          permission_ids: [...prev.permission_ids, permission.id]
                        }));
                      } else {
                        setBulkAssignment(prev => ({
                          ...prev,
                          permission_ids: prev.permission_ids.filter(id => id !== permission.id)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{permission.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effect
              </label>
              <Select
                value={bulkAssignment.effect}
                onChange={(value) => setBulkAssignment(prev => ({ 
                  ...prev, 
                  effect: value as 'allow' | 'deny' 
                }))}
                options={[
                  { value: 'allow', label: 'Allow' },
                  { value: 'deny', label: 'Deny' }
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <Input
                type="number"
                value={bulkAssignment.priority}
                onChange={(e) => setBulkAssignment(prev => ({ 
                  ...prev, 
                  priority: parseInt(e.target.value) || 0 
                }))}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsBulkAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={bulkAssignPermissions}>
              Assign Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdvancedPermissionsDashboard; 