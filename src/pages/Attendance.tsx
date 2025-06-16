import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coffee,
  Timer,
  Eye,
  Edit,
  TrendingUp,
  BarChart3,
  Activity,
  Thermometer,
  Battery,
  Wifi,
  Smartphone,
  Heart,
  MapMarker,
  Settings,
  FileText,
  Star,
  Smile,
  Meh,
  Frown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { SERVER_URL } from '../config/api';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workingHours: number;
  breakHours?: number;
  overtimeHours?: number;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    type: string;
    duration?: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  }>;
  notes?: string;
  isRemote?: boolean;
  temperature?: number;
  symptoms?: string[];
  device?: {
    userAgent: string;
    platform: string;
  };
  mood?: 'excellent' | 'good' | 'neutral' | 'tired' | 'stressed';
  productivity?: {
    score: number;
    tasksCompleted: number;
    selfAssessment?: string;
  };
  batteryLevel?: number;
  gpsAccuracy?: number;
  rfidCardId?: string;
  networkInfo?: {
    connectionType: string;
    signalStrength: number;
    networkName: string;
  };
  weather?: {
    condition: string;
    temperature: number;
    humidity: number;
  };
  corrections?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
    correctedAt: string;
  }>;
  approvalRequired?: boolean;
}

interface AttendanceResponse {
  success: boolean;
  attendance: AttendanceRecord[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
  };
  summary?: {
    totalWorkingHours: number;
    totalBreakHours: number;
    totalOvertimeHours: number;
    averageWorkingHours: number;
  };
}

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [correctionForm, setCorrectionForm] = useState({
    field: '',
    newValue: '',
    reason: ''
  });
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter,
        includeBreaks: 'true'
      });

      const response = await fetch(`${SERVER_URL}/api/attendance/history?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: AttendanceResponse = await response.json();
        setAttendanceData(data.attendance);
        setTotalPages(data.pagination.totalPages);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [currentPage, dateRange, statusFilter]);

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM dd, yyyy');
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'h:mm a');
  };

  const formatWorkingHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'late':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'half-day':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'half-day':
        return 'bg-orange-100 text-orange-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'excellent':
        return <Smile className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Smile className="h-4 w-4 text-blue-500" />;
      case 'neutral':
        return <Meh className="h-4 w-4 text-gray-500" />;
      case 'tired':
        return <Frown className="h-4 w-4 text-orange-500" />;
      case 'stressed':
        return <Frown className="h-4 w-4 text-red-500" />;
      default:
        return <Meh className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProductivityStars = (score: number) => {
    return Array.from({ length: 10 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < score ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
      />
    ));
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/attendance/analytics?period=30`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCorrection = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/attendance/correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          attendanceId: selectedRecord?._id,
          ...correctionForm
        })
      });

      if (response.ok) {
        alert('Correction request submitted successfully');
        setShowCorrection(false);
        setCorrectionForm({ field: '', newValue: '', reason: '' });
        fetchAttendanceData();
      } else {
        const data = await response.json();
        alert(data.message || 'Error submitting correction');
      }
    } catch (error) {
      console.error('Error submitting correction:', error);
      alert('Error submitting correction');
    }
  };

  const exportToCSV = () => {
    if (attendanceData.length === 0) return;

    const headers = ['Date', 'Check In', 'Check Out', 'Status', 'Working Hours', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(record => [
        record.date,
        formatTime(record.checkIn),
        record.checkOut ? formatTime(record.checkOut) : 'Not checked out',
        record.status,
        formatWorkingHours(record.workingHours),
        record.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance History</h1>
          <p className="text-gray-600">Track your attendance and working hours</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={exportToCSV}
            disabled={attendanceData.length === 0}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2
                     transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setShowAnalytics(true);
              fetchAnalytics();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 
                     flex items-center space-x-2 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half-day">Half Day</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({
                  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
                });
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-colors text-gray-700"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading attendance data...</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No attendance records found for the selected period</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">                <thead className="bg-gray-50">
                <tr>
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
                    Working Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Breaks
                  </th>                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mood & Productivity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(record.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatTime(record.checkIn)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{record.checkOut ? formatTime(record.checkOut) : 'Not checked out'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.workingHours > 0 ? formatWorkingHours(record.workingHours) : '-'}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkInLocation || record.checkOutLocation ? (
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>Available</span>
                            {record.isRemote && (
                              <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Remote
                              </span>
                            )}
                            {record.gpsAccuracy && (
                              <span className="ml-1 text-xs text-gray-500">
                                ±{record.gpsAccuracy}m
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No location</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {record.mood && (
                            <div className="flex items-center space-x-1">
                              {getMoodIcon(record.mood)}
                              <span className="text-xs text-gray-600 capitalize">{record.mood}</span>
                            </div>
                          )}
                          {record.productivity?.score && (
                            <div className="flex items-center space-x-1">
                              <div className="flex space-x-0.5">
                                {getProductivityStars(record.productivity.score)}
                              </div>
                              <span className="text-xs text-gray-600">
                                ({record.productivity.score}/10)
                              </span>
                            </div>
                          )}
                          {record.productivity?.tasksCompleted !== undefined && (
                            <div className="text-xs text-gray-600">
                              Tasks: {record.productivity.tasksCompleted}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {record.temperature && (
                            <div className="flex items-center space-x-1">
                              <Thermometer className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-gray-600">{record.temperature}°C</span>
                            </div>
                          )}
                          {record.symptoms && record.symptoms.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-gray-600">
                                {record.symptoms.length} symptom{record.symptoms.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {record.batteryLevel !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Battery className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-gray-600">{record.batteryLevel}%</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">View</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowCorrection(true);
                            }}
                            className="text-orange-600 hover:text-orange-900 flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="text-sm">Correct</span>
                          </button>
                          {record.approvalRequired && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending
                            </span>
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
              </div>)}
          </>
        )}
      </div>

      {/* Detailed View Modal */}
      {showDetails && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Attendance Details - {formatDate(selectedRecord.date)}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Time Information</span>
                  </h4>
                  <div className="space-y-2 pl-7">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Check In:</span>
                      <span className="font-medium">{formatTime(selectedRecord.checkIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Check Out:</span>
                      <span className="font-medium">
                        {selectedRecord.checkOut ? formatTime(selectedRecord.checkOut) : 'Not checked out'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Working Hours:</span>
                      <span className="font-medium">{formatWorkingHours(selectedRecord.workingHours)}</span>
                    </div>
                    {selectedRecord.breakHours && selectedRecord.breakHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Break Hours:</span>
                        <span className="font-medium">{formatWorkingHours(selectedRecord.breakHours)}</span>
                      </div>
                    )}
                    {selectedRecord.overtimeHours && selectedRecord.overtimeHours > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Overtime:</span>
                        <span className="font-medium text-orange-600">
                          {formatWorkingHours(selectedRecord.overtimeHours)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Performance & Mood</span>
                  </h4>
                  <div className="space-y-2 pl-7">
                    {selectedRecord.mood && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Mood:</span>
                        <div className="flex items-center space-x-1">
                          {getMoodIcon(selectedRecord.mood)}
                          <span className="font-medium capitalize">{selectedRecord.mood}</span>
                        </div>
                      </div>
                    )}
                    {selectedRecord.productivity?.score && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Productivity:</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-0.5">
                            {getProductivityStars(selectedRecord.productivity.score)}
                          </div>
                          <span className="font-medium">({selectedRecord.productivity.score}/10)</span>
                        </div>
                      </div>
                    )}
                    {selectedRecord.productivity?.tasksCompleted !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tasks Completed:</span>
                        <span className="font-medium">{selectedRecord.productivity.tasksCompleted}</span>
                      </div>
                    )}
                    {selectedRecord.productivity?.selfAssessment && (
                      <div className="mt-2">
                        <span className="text-gray-600 block mb-1">Self Assessment:</span>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg">
                          {selectedRecord.productivity.selfAssessment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Notes</span>
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{selectedRecord.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Correction Request Modal */}
      {showCorrection && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Request Correction</h3>
                <button
                  onClick={() => setShowCorrection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field to Correct
                </label>
                <select
                  value={correctionForm.field}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, field: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select field</option>
                  <option value="checkIn">Check In Time</option>
                  <option value="checkOut">Check Out Time</option>
                  <option value="status">Status</option>
                  <option value="notes">Notes</option>
                  <option value="isRemote">Work Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Value
                </label>
                <input
                  type="text"
                  value={correctionForm.newValue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, newValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter the correct value"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Correction
                </label>
                <textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explain why this correction is needed"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCorrection(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCorrection}
                  disabled={!correctionForm.field || !correctionForm.newValue || !correctionForm.reason}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && analytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Advanced Analytics</h3>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">Avg Productivity</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {analytics.averageProductivity.toFixed(1)}/10
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Punctuality</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {analytics.punctualityRate}%
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">Avg Overtime</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {Math.round(analytics.overtimeAnalysis.averageOvertimePerDay)}m
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Remote Days</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {analytics.locationAnalysis.remoteVsOffice.remote}
                  </p>
                </div>
              </div>

              {/* Charts and Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mood Distribution */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Mood Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.moodDistribution).map(([mood, count]) => (
                      <div key={mood} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getMoodIcon(mood)}
                          <span className="capitalize">{mood}</span>
                        </div>
                        <span className="font-medium">{count as number} days</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Break Patterns */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Break Patterns</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.breakPatterns).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Coffee className="h-4 w-4 text-brown-500" />
                          <span className="capitalize">{type}</span>
                        </div>
                        <span className="font-medium">{count as number} times</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;