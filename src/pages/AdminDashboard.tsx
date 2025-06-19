import { useState, useEffect, useCallback } from 'react';
import {
    Users,
    ClipboardList,
    TrendingUp,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Activity,
    UserCheck,
    Timer,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { SERVER_URL } from '../config/api';

interface DashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    totalTasks: number;
    overdueTasks: number;
    todayAttendance: number;
    currentCheckins: number;
    taskStats: {
        pending: number;
        'in-progress': number;
        completed: number;
        overdue: number;
    };
    attendanceStats: {
        present: number;
        absent: number;
        late: number;
        onTime: number;
    };
    productivityMetrics: {
        avgProductivity: number;
        avgWorkHours: number;
        totalWorkHours: number;
    };
    departmentStats?: Array<{
        _id: string;
        count: number;
        activeCount: number;
    }>;
}

interface RecentActivity {
    _id: string;
    type: 'checkin' | 'checkout' | 'break_start' | 'break_end' | 'task_completed' | 'task_assigned';
    user: {
        _id: string;
        name: string;
        department: string;
    };
    description: string;
    timestamp: string;
}

interface TopPerformer {
    _id: string;
    name: string;
    department: string;
    completedTasks: number;
    avgProductivity: number;
    totalWorkHours: number;
}

interface AttendanceRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        department: string;
    };
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

const AdminDashboard = () => {
    const { user } = useAuth();
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTimeRange, setSelectedTimeRange] = useState('week');
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<AttendanceRecord | null>(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            const promises = [
                // Fetch dashboard statistics
                fetch(`${SERVER_URL}/api/admin/dashboard?timeRange=${selectedTimeRange}`, {
                    credentials: 'include'
                }),
                // Fetch recent activities
                fetch(`${SERVER_URL}/api/admin/recent-activities?limit=10`, {
                    credentials: 'include'
                }),
                // Fetch top performers
                fetch(`${SERVER_URL}/api/admin/top-performers?timeRange=${selectedTimeRange}&limit=5`, {
                    credentials: 'include'
                }),
                // Fetch attendance records
                fetch(`${SERVER_URL}/api/admin/attendance-records?timeRange=${selectedTimeRange}`, {
                    credentials: 'include'
                })
            ];

            const [statsResponse, activitiesResponse, performersResponse, attendanceResponse] = await Promise.allSettled(promises);

            // Handle dashboard stats
            if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
                const statsData = await statsResponse.value.json();
                if (statsData.success) {
                    setDashboardStats(statsData.data);
                } else {
                    console.warn('Dashboard stats API returned error:', statsData.message);
                }
            } else {
                console.error('Failed to fetch dashboard stats');
            }

            // Handle recent activities
            if (activitiesResponse.status === 'fulfilled' && activitiesResponse.value.ok) {
                const activitiesData = await activitiesResponse.value.json();
                if (activitiesData.success) {
                    setRecentActivities(activitiesData.data);
                } else {
                    console.warn('Recent activities API returned error:', activitiesData.message);
                }
            } else {
                console.error('Failed to fetch recent activities');
            }

            // Handle top performers
            if (performersResponse.status === 'fulfilled' && performersResponse.value.ok) {
                const performersData = await performersResponse.value.json();
                if (performersData.success) {
                    setTopPerformers(performersData.data);
                } else {
                    console.warn('Top performers API returned error:', performersData.message);
                }
            } else {
                console.error('Failed to fetch top performers');
            }

            // Handle attendance records
            if (attendanceResponse.status === 'fulfilled' && attendanceResponse.value.ok) {
                const attendanceData = await attendanceResponse.value.json();
                if (attendanceData.success) {
                    setAttendanceRecords(attendanceData.data);
                } else {
                    console.warn('Attendance records API returned error:', attendanceData.message);
                }
            } else {
                console.error('Failed to fetch attendance records');
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [selectedTimeRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'checkin':
                return <Clock className="h-4 w-4 text-green-600" />;
            case 'checkout':
                return <Clock className="h-4 w-4 text-red-600" />;
            case 'break_start':
                return <Timer className="h-4 w-4 text-orange-600" />;
            case 'break_end':
                return <Timer className="h-4 w-4 text-blue-600" />;
            case 'task_completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'task_assigned':
                return <ClipboardList className="h-4 w-4 text-blue-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'checkin':
                return 'border-green-200 bg-green-50';
            case 'checkout':
                return 'border-red-200 bg-red-50';
            case 'break_start':
            case 'break_end':
                return 'border-orange-200 bg-orange-50';
            case 'task_completed':
                return 'border-green-200 bg-green-50';
            case 'task_assigned':
                return 'border-blue-200 bg-blue-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };

    if (loading && !dashboardStats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600">Overview of your organization's performance and activities</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                    <button
                        onClick={fetchDashboardData}
                        disabled={loading}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                    <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Employees */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalEmployees}</p>
                                <p className="text-sm text-green-600">
                                    {dashboardStats.activeEmployees} active
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Today's Attendance */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Calendar className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
                                <p className="text-2xl font-bold text-gray-900">{dashboardStats.todayAttendance}</p>
                                <p className="text-sm text-blue-600">
                                    {dashboardStats.currentCheckins} currently checked in
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Total Tasks */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <ClipboardList className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalTasks}</p>
                                <p className="text-sm text-orange-600">
                                    {dashboardStats.overdueTasks} overdue
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Productivity */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <TrendingUp className="h-8 w-8 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Avg Productivity</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {dashboardStats.productivityMetrics.avgProductivity.toFixed(1)}%
                                </p>
                                <p className="text-sm text-green-600">
                                    {dashboardStats.productivityMetrics.avgWorkHours.toFixed(1)}h avg work
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Task & Attendance Statistics */}
            {dashboardStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Stats */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Task Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pending</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.taskStats.pending / dashboardStats.totalTasks) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.taskStats.pending}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">In Progress</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.taskStats['in-progress'] / dashboardStats.totalTasks) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.taskStats['in-progress']}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Completed</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.taskStats.completed / dashboardStats.totalTasks) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.taskStats.completed}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Overdue</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.taskStats.overdue / dashboardStats.totalTasks) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.taskStats.overdue}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Stats */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Present</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.attendanceStats.present / dashboardStats.todayAttendance) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.attendanceStats.present}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Late</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-orange-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.attendanceStats.late / dashboardStats.todayAttendance) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.attendanceStats.late}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">On Time</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.attendanceStats.onTime / dashboardStats.todayAttendance) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.attendanceStats.onTime}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Absent</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${(dashboardStats.attendanceStats.absent / dashboardStats.totalEmployees) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">{dashboardStats.attendanceStats.absent}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activities & Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {recentActivities.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No recent activities</p>
                        ) : (
                            recentActivities.map((activity) => (<div key={activity._id} className={`p-3 rounded-lg border ${getActivityColor(activity.type)}`}>
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {activity.user.name}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {activity.description}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {format(new Date(activity.timestamp), 'MMM dd, h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
                    <div className="space-y-4">
                        {topPerformers.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No performance data available</p>
                        ) : (
                            topPerformers.map((performer, index) => (
                                <div key={performer._id} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50">
                                    <div className="flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${index === 0 ? 'bg-yellow-500' :
                                                index === 1 ? 'bg-gray-400' :
                                                    index === 2 ? 'bg-yellow-600' : 'bg-blue-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {performer.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {performer.department}
                                        </p>                                        <p className="text-sm font-medium text-gray-900">
                                            {performer.completedTasks} tasks
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {performer.avgProductivity.toFixed(1)}% productivity
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Attendance Records Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Attendance Records</h3>
                    <div className="flex space-x-2">
                        <select
                            value={selectedTimeRange}
                            onChange={(e) => setSelectedTimeRange(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                        <button
                            onClick={() => setShowAttendanceModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            View All
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading attendance records...</p>
                    </div>
                ) : attendanceRecords.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No attendance records found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Check In
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Check Out
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hours
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Breaks
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendanceRecords.slice(0, 10).map((record) => (
                                    <tr key={record._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {record.userId.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {record.userId.department}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {format(new Date(record.date), 'MMM dd, yyyy')}
                                            </div>
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
                                            {record.isRemote && (
                                                <span className="ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    Remote
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                                {format(new Date(record.checkIn), 'HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                                                {record.checkOut
                                                    ? format(new Date(record.checkOut), 'HH:mm')
                                                    : 'Not checked out'
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {(record.workingHours / 60).toFixed(1)}h
                                            {record.breakHours && record.breakHours > 0 && (
                                                <div className="text-xs text-gray-500">
                                                    -{(record.breakHours / 60).toFixed(1)}h break
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {record.breaks && record.breaks.length > 0 ? (
                                                <div className="flex items-center">
                                                    <Timer className="h-4 w-4 text-gray-400 mr-1" />
                                                    {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">No breaks</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    setSelectedAttendanceRecord(record);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                            >
                                                <Activity className="h-4 w-4" />
                                                <span>View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Attendance Details Modal */}
            {selectedAttendanceRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Attendance Details - {selectedAttendanceRecord.userId.name}
                                </h3>
                                <button
                                    onClick={() => setSelectedAttendanceRecord(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                >
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                                {format(new Date(selectedAttendanceRecord.date), 'EEEE, MMMM dd, yyyy')}
                            </p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                        <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                                        Employee Information
                                    </h4>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-sm text-gray-600">Name:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.userId.name}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Email:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.userId.email}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Department:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.userId.department}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                        <Clock className="h-5 w-5 mr-2 text-green-600" />
                                        Time Information
                                    </h4>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-sm text-gray-600">Check In:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {format(new Date(selectedAttendanceRecord.checkIn), 'hh:mm a')}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Check Out:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.checkOut
                                                    ? format(new Date(selectedAttendanceRecord.checkOut), 'hh:mm a')
                                                    : 'Not checked out'
                                                }
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Status:</span>
                                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${selectedAttendanceRecord.status === 'present'
                                                    ? 'bg-green-100 text-green-800'
                                                    : selectedAttendanceRecord.status === 'late'
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : selectedAttendanceRecord.status === 'absent'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {selectedAttendanceRecord.status}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Working Hours:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {(selectedAttendanceRecord.workingHours / 60).toFixed(1)} hours
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Remote Work:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.isRemote ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        {selectedAttendanceRecord.mood && (
                                            <div>
                                                <span className="text-sm text-gray-600">Mood:</span>
                                                <span className="ml-2 text-sm font-medium capitalize">
                                                    {selectedAttendanceRecord.mood}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Breaks */}
                            {selectedAttendanceRecord.breaks && selectedAttendanceRecord.breaks.length > 0 && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                        <Timer className="h-5 w-5 mr-2 text-orange-600" />
                                        Break Details
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedAttendanceRecord.breaks.map((breakItem, index) => (
                                            <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                                                <div>
                                                    <span className="text-sm font-medium capitalize">{breakItem.type}</span>
                                                    <div className="text-xs text-gray-500">
                                                        {format(new Date(breakItem.breakStart), 'HH:mm')}
                                                        {breakItem.breakEnd && ` - ${format(new Date(breakItem.breakEnd), 'HH:mm')}`}
                                                    </div>
                                                </div>
                                                {breakItem.duration && (
                                                    <span className="text-sm text-gray-600">
                                                        {breakItem.duration} min
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Productivity */}
                            {selectedAttendanceRecord.productivity && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                        <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                                        Productivity Metrics
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm text-gray-600">Score:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.productivity.score}/10
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-600">Tasks Completed:</span>
                                            <span className="ml-2 text-sm font-medium">
                                                {selectedAttendanceRecord.productivity.tasksCompleted}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setSelectedAttendanceRecord(null)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* All Attendance Records Modal */}
            {showAttendanceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">All Attendance Records</h3>
                                <button
                                    onClick={() => setShowAttendanceModal(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                >
                                    <XCircle className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="text-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 mt-4">Loading attendance records...</p>
                                </div>
                            ) : attendanceRecords.length === 0 ? (
                                <div className="text-center py-20">
                                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No attendance records found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In/Out</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productivity</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {attendanceRecords.map((record) => (
                                                <tr key={record._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {record.userId.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {record.userId.department}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {format(new Date(record.date), 'MMM dd, yyyy')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col space-y-1">
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
                                                            {record.isRemote && (
                                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                    Remote
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center">
                                                                <Clock className="h-3 w-3 text-green-500 mr-1" />
                                                                {format(new Date(record.checkIn), 'HH:mm')}
                                                            </div>
                                                            {record.checkOut && (
                                                                <div className="flex items-center">
                                                                    <Clock className="h-3 w-3 text-red-500 mr-1" />
                                                                    {format(new Date(record.checkOut), 'HH:mm')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        <div>
                                                            <div className="font-medium">
                                                                {(record.workingHours / 60).toFixed(1)}h
                                                            </div>
                                                            {record.breaks && record.breaks.length > 0 && (
                                                                <div className="text-xs text-gray-500">
                                                                    {record.breaks.length} break{record.breaks.length > 1 ? 's' : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {record.productivity ? (
                                                            <div>
                                                                <div className="flex items-center">
                                                                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                                                    {record.productivity.score}/10
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {record.productivity.tasksCompleted} tasks
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAttendanceRecord(record);
                                                                setShowAttendanceModal(false);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                                        >
                                                            <Activity className="h-4 w-4" />
                                                            <span>View</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
