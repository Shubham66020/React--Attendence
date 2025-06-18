import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  Mail,
  Calendar,
  Building,
  ClipboardList,
  BarChart3,
  Clock,
  Target,
  XCircle,
  Eye,
  User,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { SERVER_URL } from '../config/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
  status: 'active' | 'inactive';
  department: string;
  joinedDate: string;
  lastLogin?: string;
  assignedTasks?: string[];
  profile?: {
    phone?: string;
    address?: string;
    skills?: string[];
    experience?: number;
  };
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  category: string;
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
}

interface EmployeeStats {
  attendance: {
    totalDays: number;
    totalHours: number;
    avgProductivity: number;
    lateArrivals: number;
    earlyDepartures: number;
  };
  tasks: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalHoursWorked: number;
    avgProgress: number;
  };
  recentAttendance?: Array<{
    date: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
    breaks?: Array<{
      breakStart: string;
      breakEnd?: string;
      type: string;
    }>;
  }>;
}

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workingHours: number;
  breakHours?: number;
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    type: string;
    duration?: number;
  }>;
  isRemote?: boolean;
  mood?: string;
  productivity?: {
    score: number;
    tasksCompleted: number;
  };
}

interface EmployeeResponse {
  success: boolean;
  employees: Employee[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
}

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null); const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTaskCompletionModal, setShowTaskCompletionModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedTaskForCompletion, setSelectedTaskForCompletion] = useState<Task | null>(null);
  const [taskCompletionReason, setTaskCompletionReason] = useState('');
  const [taskAction, setTaskAction] = useState<'completed' | 'cancelled'>('completed');
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all'
  }); const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: '',
    estimatedHours: '',
    category: 'other' as 'development' | 'design' | 'testing' | 'documentation' | 'meeting' | 'research' | 'other'
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  // const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'hr' | 'employee',
    department: 'General'
  });
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: filters.search,
        role: filters.role,
        status: filters.status
      });

      const response = await fetch(`${SERVER_URL}/api/employees?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: EmployeeResponse = await response.json();
        setEmployees(data.employees);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${SERVER_URL}/api/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowAddModal(false);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Failed to add employee');
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/employees/${editingEmployee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          status: editingEmployee.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setEditingEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/employees/${employeeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    try {
      const newStatus = employee.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`${SERVER_URL}/api/employees/${employee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
        fetchEmployees();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating employee status:', error);
      toast.error('Failed to update employee status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: 'General'
    });
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      department: employee.department
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    resetForm();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // New admin functions for task management and statistics
  const fetchEmployeeStats = async (employeeId: string) => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/employees/${employeeId}/stats`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeStats(data.data);
      } else {
        toast.error('Failed to fetch employee statistics');
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      toast.error('Failed to fetch employee statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchEmployeeTasks = async (employeeId: string) => {
    setTasksLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/tasks?assignedTo=${employeeId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeTasks(data.tasks);
      } else {
        toast.error('Failed to fetch employee tasks');
      }
    } catch (error) {
      console.error('Error fetching employee tasks:', error);
      toast.error('Failed to fetch employee tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchEmployeeAttendance = async (employeeId: string) => {
    setAttendanceLoading(true);
    try {
      const response = await fetch(`${SERVER_URL}/api/admin/employee-attendance/${employeeId}?limit=30`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployeeAttendance(data.data || []);
      } else {
        toast.error('Failed to fetch employee attendance');
      }
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      toast.error('Failed to fetch employee attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openStatsModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowStatsModal(true);
    fetchEmployeeStats(employee._id);
  };
  const openTaskModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowTaskModal(true);
    fetchEmployeeTasks(employee._id);
  };
  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
    // Refresh both stats and tasks when viewing details
    fetchEmployeeStats(employee._id);
    fetchEmployeeTasks(employee._id);
  };

  const handleAssignTask = async () => {
    if (!selectedEmployee) return;

    try {
      const response = await fetch(`${SERVER_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newTask,
          assignedTo: selectedEmployee._id,
          estimatedHours: newTask.estimatedHours ? parseInt(newTask.estimatedHours) : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Task assigned successfully'); setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          dueDate: '',
          estimatedHours: '',
          category: 'other'
        });
        fetchEmployeeTasks(selectedEmployee._id);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      toast.error('Failed to assign task');
    }
  };
  const updateTaskStatus = async (taskId: string, status: string, reason?: string) => {
    try {
      const requestBody: { status: string; completionReason?: string } = { status };

      if (reason && (status === 'completed' || status === 'cancelled')) {
        requestBody.completionReason = reason;
      }

      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        toast.success('Task status updated');
        if (selectedEmployee) {
          fetchEmployeeTasks(selectedEmployee._id);
        }
        setShowTaskCompletionModal(false);
        setSelectedTaskForCompletion(null);
        setTaskCompletionReason('');
      } else {
        const data = await response.json();
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleTaskCompletion = (task: Task, action: 'completed' | 'cancelled') => {
    setSelectedTaskForCompletion(task);
    setTaskAction(action);
    setShowTaskCompletionModal(true);
  };

  const handleCompleteTaskWithReason = () => {
    if (selectedTaskForCompletion) {
      updateTaskStatus(selectedTaskForCompletion._id, taskAction, taskCompletionReason);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'hr':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage your organization's employees</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 
                   flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="employee">Employee</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => {
              setFilters({ search: '', role: 'all', status: 'all' });
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                     transition-colors text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employees ({employees.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading employees...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getRoleColor(employee.role)}`}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Building className="h-4 w-4 mr-1 text-gray-400" />
                          {employee.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(employee)}
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(employee.status)} hover:opacity-80 transition-opacity`}
                        >
                          {employee.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {format(new Date(employee.joinedDate), 'MMM dd, yyyy')}
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">                        <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(employee)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="View detailed information"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit employee"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openStatsModal(employee)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="View statistics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>                        <button
                          onClick={() => openTaskModal(employee)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Manage tasks"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowAttendanceModal(true);
                            fetchEmployeeAttendance(employee._id);
                          }}
                          className="text-orange-600 hover:text-orange-900 transition-colors"
                          title="View attendance"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteEmployee(employee._id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium 
                             text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium 
                             text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Employee Modal */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h3>

            <form onSubmit={editingEmployee ? handleEditEmployee : handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {!editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'hr' | 'employee' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 
                           transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors flex items-center space-x-2"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{editingEmployee ? 'Update' : 'Add'} Employee</span>
                </button>
              </div>
            </form>
          </div>        </div>
      )}

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Employee Details - {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Basic Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {selectedEmployee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <h5 className="text-lg font-medium text-gray-900">{selectedEmployee.name}</h5>
                          <p className="text-sm text-gray-600">ID: {selectedEmployee._id}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedEmployee.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Role</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize mt-1 ${getRoleColor(selectedEmployee.role)}`}>
                            {selectedEmployee.role}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Department</label>
                          <p className="text-sm text-gray-900 mt-1">{selectedEmployee.department}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize mt-1 ${getStatusColor(selectedEmployee.status)}`}>
                            {selectedEmployee.status}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Joined Date</label>
                          <p className="text-sm text-gray-900 mt-1">{format(new Date(selectedEmployee.joinedDate), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Employee Since</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {Math.floor((new Date().getTime() - new Date(selectedEmployee.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  {employeeStats && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        Quick Stats Overview
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <p className="text-xs text-blue-700 font-medium">Total Days</p>
                          <p className="text-lg font-bold text-blue-900">{employeeStats.attendance.totalDays}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-lg">
                          <p className="text-xs text-green-700 font-medium">Work Hours</p>
                          <p className="text-lg font-bold text-green-900">{employeeStats.attendance.totalHours}h</p>
                        </div>                        <div className="bg-purple-100 p-3 rounded-lg">
                          <p className="text-xs text-purple-700 font-medium">Avg Productivity</p>
                          <p className="text-lg font-bold text-purple-900">{employeeStats.attendance.avgProductivity}%</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-lg">
                          <p className="text-xs text-orange-700 font-medium">Tasks Completed</p>
                          <p className="text-lg font-bold text-orange-900">{employeeStats.tasks.completedTasks}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Stats */}
                <div className="space-y-6">
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : employeeStats ? (
                    <>
                      {/* Attendance Details */}
                      <div className="bg-white border rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Calendar className="h-5 w-5 mr-2" />
                          Attendance Details
                        </h4>                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Days:</span>
                            <span className="font-medium text-green-600">{employeeStats.attendance.totalDays}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Late Arrivals:</span>
                            <span className="font-medium text-orange-600">{employeeStats.attendance.lateArrivals}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Early Departures:</span>
                            <span className="font-medium text-blue-600">{employeeStats.attendance.earlyDepartures}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Work Hours:</span>
                            <span className="font-medium text-gray-900">{employeeStats.attendance.totalHours}h</span>
                          </div>
                        </div>
                      </div>

                      {/* Task Management */}
                      <div className="bg-white border rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <ClipboardList className="h-5 w-5 mr-2" />
                          Task Performance
                        </h4>                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Tasks:</span>
                            <span className="font-medium text-gray-900">{employeeStats.tasks.totalTasks}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Completed:</span>
                            <span className="font-medium text-green-600">{employeeStats.tasks.completedTasks}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Overdue:</span>
                            <span className="font-medium text-red-600">{employeeStats.tasks.overdueTasks}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Hours Worked:</span>
                            <span className="font-medium text-blue-600">{employeeStats.tasks.totalHoursWorked}h</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Completion Rate:</span>
                            <span className="font-medium text-purple-600">
                              {employeeStats.tasks.totalTasks > 0 ? Math.round((employeeStats.tasks.completedTasks / employeeStats.tasks.totalTasks) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Productivity Metrics */}
                      <div className="bg-white border rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Productivity Metrics
                        </h4>                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Average Productivity:</span>
                            <span className="font-medium text-blue-600">{employeeStats.attendance.avgProductivity}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Task Progress:</span>
                            <span className="font-medium text-green-600">{employeeStats.tasks.avgProgress}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Work Hours:</span>
                            <span className="font-medium text-gray-900">{employeeStats.tasks.totalHoursWorked}h</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Average Daily Hours:</span>
                            <span className="font-medium text-indigo-600">
                              {employeeStats.attendance.totalDays > 0 ?
                                Math.round((employeeStats.attendance.totalHours / employeeStats.attendance.totalDays) * 10) / 10 : 0}h
                            </span>
                          </div>                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white border rounded-xl p-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                          <Activity className="h-5 w-5 mr-2" />
                          Recent Activity
                        </h4>
                        <div className="space-y-3">
                          {employeeStats.recentAttendance && employeeStats.recentAttendance.length > 0 ? (
                            employeeStats.recentAttendance.slice(0, 5).map((record, index: number) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-green-500' :
                                    record.status === 'late' ? 'bg-orange-500' : 'bg-red-500'
                                    }`}></div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {format(new Date(record.date), 'MMM dd, yyyy')}
                                    </p>
                                    <p className="text-xs text-gray-600 capitalize">{record.status}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {record.checkIn && (
                                    <p className="text-xs text-gray-600">
                                      In: {format(new Date(record.checkIn), 'HH:mm')}
                                    </p>
                                  )}
                                  {record.checkOut && (
                                    <p className="text-xs text-gray-600">
                                      Out: {format(new Date(record.checkOut), 'HH:mm')}
                                    </p>
                                  )}
                                  {record.breaks && record.breaks.length > 0 && (
                                    <p className="text-xs text-orange-600">
                                      {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4">
                              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">No recent activity</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No statistics available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openStatsModal(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>View Full Stats</span>
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openTaskModal(selectedEmployee);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Manage Tasks</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Statistics Modal */}
      {showStatsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Statistics for {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div>
                {/* Attendance Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg shadow">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Attendance
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-blue-600">
                        {employeeStats?.attendance.totalDays}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total Days
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-2xl font-bold text-blue-600">
                        {employeeStats?.attendance.totalHours} hrs
                      </div>
                      <div className="text-sm text-gray-500">
                        Total Hours
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg shadow">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Productivity
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-green-600">
                        {employeeStats?.attendance.avgProductivity}%
                      </div>
                      <div className="text-sm text-gray-500">
                        Avg. Productivity
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-2xl font-bold text-green-600">
                        {employeeStats?.attendance.lateArrivals}
                      </div>
                      <div className="text-sm text-gray-500">
                        Late Arrivals
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks Stats */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Task Statistics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Total Tasks
                      </div>
                      <div className="text-gray-900 font-medium">
                        {employeeStats?.tasks.totalTasks}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Completed Tasks
                      </div>
                      <div className="text-gray-900 font-medium">
                        {employeeStats?.tasks.completedTasks}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Overdue Tasks
                      </div>
                      <div className="text-gray-900 font-medium">
                        {employeeStats?.tasks.overdueTasks}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Total Hours Worked
                      </div>
                      <div className="text-gray-900 font-medium">
                        {employeeStats?.tasks.totalHoursWorked} hrs
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-500 text-sm">
                        Avg. Task Progress
                      </div>
                      <div className="text-gray-900 font-medium">
                        {employeeStats?.tasks.avgProgress}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}      {/* Employee Tasks Modal */}
      {showTaskModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Task Management for {selectedEmployee.name}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign New Task */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign New Task
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter task title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter task description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value as 'development' | 'design' | 'testing' | 'documentation' | 'meeting' | 'research' | 'other' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="development">Development</option>
                        <option value="design">Design</option>
                        <option value="testing">Testing</option>
                        <option value="documentation">Documentation</option>
                        <option value="meeting">Meeting</option>
                        <option value="research">Research</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Hours"
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAssignTask}
                    disabled={!newTask.title || !newTask.description || !newTask.dueDate}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 
                             disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                             flex items-center justify-center space-x-2"
                  >
                    <Target className="h-4 w-4" />
                    <span>Assign Task</span>
                  </button>
                </div>
              </div>

              {/* Current Tasks */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Current Tasks ({employeeTasks.length})
                </h4>

                {tasksLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  </div>
                ) : employeeTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No tasks assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {employeeTasks.map((task) => (
                      <div key={task._id} className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">
                              {task.title}
                            </h5>
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="flex items-center text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(task.dueDate), 'MMM dd')}
                              </span>
                              <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                            {task.estimatedHours && (
                              <div className="mt-1 text-xs text-gray-500">
                                Est: {task.estimatedHours}h
                              </div>
                            )}
                          </div>                          <div className="flex flex-col space-y-1 ml-2">
                            {task.status === 'pending' && (
                              <button
                                onClick={() => updateTaskStatus(task._id, 'in-progress')}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                              >
                                Start
                              </button>
                            )}
                            {task.status === 'in-progress' && (
                              <button
                                onClick={() => handleTaskCompletion(task, 'completed')}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <button
                                onClick={() => updateTaskStatus(task._id, 'pending')}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                              >
                                Reopen
                              </button>
                            )}
                            {task.status !== 'completed' && task.status !== 'cancelled' && (
                              <button
                                onClick={() => handleTaskCompletion(task, 'cancelled')}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>          </div>
        </div>
      )}

      {/* Task Completion Modal */}
      {showTaskCompletionModal && selectedTaskForCompletion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task: {selectedTaskForCompletion.title}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {taskAction === 'completed' ? 'Completion' : 'Cancellation'} Reason
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={taskCompletionReason}
                onChange={(e) => setTaskCompletionReason(e.target.value)}
                placeholder={
                  taskAction === 'completed'
                    ? "Please describe what was accomplished..."
                    : "Please explain why this task is being cancelled..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {taskCompletionReason.length}/500 characters (Required)
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowTaskCompletionModal(false);
                  setSelectedTaskForCompletion(null);
                  setTaskCompletionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>              <button
                onClick={handleCompleteTaskWithReason}
                disabled={!taskCompletionReason.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${taskAction === 'completed'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {taskAction === 'completed' ? 'Complete' : 'Cancel'} Task
              </button>
            </div>          </div>
        </div>
      )}

      {/* Employee Attendance Modal */}
      {showAttendanceModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Attendance Records - {selectedEmployee.name}
                </h3>
                <button
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setSelectedEmployee(null);
                    setEmployeeAttendance([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {attendanceLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Working Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Breaks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remote
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mood
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Productivity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employeeAttendance.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(record.checkIn), 'HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.checkOut ? format(new Date(record.checkOut), 'HH:mm:ss') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'late'
                                  ? 'bg-orange-100 text-orange-800'
                                  : record.status === 'absent'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(record.workingHours / 60).toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.breaks && record.breaks.length > 0 ? (
                              <div className="space-y-1">
                                {record.breaks.map((breakItem, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium capitalize">{breakItem.type}</span>
                                    {breakItem.duration && (
                                      <span className="text-gray-500"> ({breakItem.duration}m)</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">No breaks</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.isRemote
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {record.isRemote ? 'Remote' : 'Office'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.mood ? (
                              <span className="capitalize">{record.mood}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.productivity ? (
                              <div>
                                <div>Score: {record.productivity.score}/10</div>
                                <div className="text-xs text-gray-500">
                                  Tasks: {record.productivity.tasksCompleted}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {employeeAttendance.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No attendance records found for this employee</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;