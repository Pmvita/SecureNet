import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card/Card';
import { Button } from '../../components/common/Button/Button';
import { Alert } from '../../components/common/Alert/Alert';
import {
  UsersIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface EmployeeData {
  summary: {
    total_count: number;
    active: number;
    on_leave: number;
    pending: number;
  };
  departments: Array<{
    name: string;
    head: string;
    count: number;
    budget_utilization: string;
    performance_score: number;
    open_positions: number;
  }>;
  recent_activities: Array<{
    type: string;
    employee: string;
    department: string;
    position?: string;
    new_position?: string;
    date: string;
    status: string;
  }>;
  access_audit: {
    last_review: string;
    next_review: string;
    compliance_score: number;
    findings: number;
  };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: 'active' | 'on_leave' | 'pending';
  access_level: string;
  last_login: string;
  hire_date: string;
  performance_score: number;
}

const EmployeeManagement: React.FC = () => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    department: 'Engineering',
    position: '',
    access_level: 'standard_user',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('http://127.0.0.1:8000/api/founder/organizational-control/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch employee data');
      }
      
      const data = await response.json();
      setEmployeeData(data.data);
      
      // Generate mock employee list for demonstration
      const mockEmployees: Employee[] = [
        {
          id: '1',
          name: 'Sarah Chen',
          email: 'sarah.chen@securenet.ai',
          department: 'Engineering',
          position: 'VP Engineering',
          status: 'active',
          access_level: 'department_admin',
          last_login: '2025-06-23T15:30:00Z',
          hire_date: '2024-01-15',
          performance_score: 4.8
        },
        {
          id: '2',
          name: 'Marcus Johnson',
          email: 'marcus.johnson@securenet.ai',
          department: 'Sales',
          position: 'VP Sales',
          status: 'active',
          access_level: 'department_admin',
          last_login: '2025-06-23T14:45:00Z',
          hire_date: '2024-02-01',
          performance_score: 4.6
        },
        {
          id: '3',
          name: 'Rachel Kim',
          email: 'rachel.kim@securenet.ai',
          department: 'Customer Success',
          position: 'Director Customer Success',
          status: 'active',
          access_level: 'department_admin',
          last_login: '2025-06-23T16:00:00Z',
          hire_date: '2024-03-10',
          performance_score: 4.9
        },
        {
          id: '4',
          name: 'David Park',
          email: 'david.park@securenet.ai',
          department: 'Engineering',
          position: 'Senior Backend Developer',
          status: 'pending',
          access_level: 'standard_user',
          last_login: 'Never',
          hire_date: '2025-06-20',
          performance_score: 0
        }
      ];
      
      setEmployees(mockEmployees);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (action: string, details: Record<string, unknown>) => {
    try {
      await fetch('http://127.0.0.1:8000/api/founder/organizational-control/audit-log', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          category: 'employee_management',
          resource_type: 'employee',
          details,
          ip_address: 'browser_client',
          user_agent: navigator.userAgent,
          compliance_framework: 'SOC2_ISO27001',
          risk_level: 'medium'
        })
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/founder/organizational-control/employees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newEmployee)
      });

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      const result = await response.json();
      
      // Add the new employee to the list
      setEmployees(prev => [...prev, result.data.employee]);
      
      // Log the action
      await logAction('employee_created', {
        employee_name: newEmployee.name,
        employee_email: newEmployee.email,
        department: newEmployee.department,
        position: newEmployee.position
      });

      // Reset form and close modal
      setNewEmployee({
        name: '',
        email: '',
        department: 'Engineering',
        position: '',
        access_level: 'standard_user',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });
      setShowAddEmployee(false);

      // Refresh data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error creating employee:', error);
      setError(error instanceof Error ? error.message : 'Failed to create employee');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'on_leave':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'full_access':
        return 'bg-red-100 text-red-800';
      case 'department_admin':
        return 'bg-purple-100 text-purple-800';
      case 'standard_user':
        return 'bg-blue-100 text-blue-800';
      case 'restricted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(emp => emp.department === selectedDepartment);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading employee management...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" title="Error" message={error} />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="warning" title="No Data Available" message="Please check your connection and try again." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            Employee Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage internal SecureNet team access, roles, and permissions
          </p>
        </div>
        <Button 
          onClick={() => setShowAddEmployee(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-blue-600">{employeeData.summary.total_count}</p>
            </div>
            <UsersIcon className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600">{employeeData.summary.active}</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Leave</p>
              <p className="text-3xl font-bold text-yellow-600">{employeeData.summary.on_leave}</p>
            </div>
            <ClockIcon className="w-12 h-12 text-yellow-600 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-orange-600">{employeeData.summary.pending}</p>
            </div>
            <ExclamationTriangleIcon className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 text-purple-600" />
            Department Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employeeData.departments.map((dept, index) => (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <span className="text-sm text-gray-500">{dept.count} employees</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Head: {dept.head}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Utilization:</span>
                    <span className="font-medium">{dept.budget_utilization}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Performance:</span>
                    <span className="font-medium">{dept.performance_score}/5.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Open Positions:</span>
                    <span className="font-medium text-blue-600">{dept.open_positions}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* Employee List */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Employee Directory</h2>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {employeeData.departments.map(dept => (
                <option key={dept.name} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                        <div className="text-sm text-gray-500">{employee.position}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(employee.status)}
                        <span className="text-sm capitalize">{employee.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccessLevelColor(employee.access_level)}`}>
                        {employee.access_level.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.performance_score > 0 ? `${employee.performance_score}/5.0` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => logAction('employee_edit', { employee_id: employee.id, name: employee.name })}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => logAction('employee_view_permissions', { employee_id: employee.id, name: employee.name })}
                        >
                          <ShieldCheckIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Access Audit Status */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-green-600" />
            Access Audit & Compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{employeeData.access_audit.compliance_score}%</div>
              <div className="text-sm text-gray-600">Compliance Score</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{employeeData.access_audit.findings}</div>
              <div className="text-sm text-gray-600">Open Findings</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{new Date(employeeData.access_audit.last_review).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600">Last Review</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{new Date(employeeData.access_audit.next_review).toLocaleDateString()}</div>
              <div className="text-sm text-gray-600">Next Review</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Activities */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activities</h2>
          <div className="space-y-4">
            {employeeData.recent_activities.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${activity.type === 'new_hire' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type === 'new_hire' ? 'New Employee' : 'Promotion'}: {activity.employee}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activity.department} - {activity.position || activity.new_position}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(activity.date).toLocaleDateString()}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  activity.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Employee</h3>
            
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter employee full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="employee@securenet.ai"
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="department"
                  required
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Customer Success">Customer Success</option>
                  <option value="Operations">Operations</option>
                  <option value="Executive">Executive</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">Human Resources</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  id="position"
                  required
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label htmlFor="access_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Access Level *
                </label>
                <select
                  id="access_level"
                  required
                  value={newEmployee.access_level}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, access_level: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard_user">Standard User</option>
                  <option value="department_admin">Department Admin</option>
                  <option value="full_access">Full Access</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>

              <div>
                <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Hire Date *
                </label>
                <input
                  type="date"
                  id="hire_date"
                  required
                  value={newEmployee.hire_date}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, hire_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddEmployee(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Add Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement; 