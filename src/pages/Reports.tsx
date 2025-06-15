import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  Users,
  Download,
  Filter
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { SERVER_URL } from '../config/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
}

const Reports = () => {
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    totalWorkingHours: 0,
    averageWorkingHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${SERVER_URL}/api/attendance/stats`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Chart data
  const attendanceBarData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [
      {
        label: 'Days',
        data: [stats.presentDays, stats.lateDays, 30 - (stats.presentDays + stats.lateDays)],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const attendanceDoughnutData = {
    labels: ['Present', 'Late', 'Absent'],
    datasets: [
      {
        data: [stats.presentDays, stats.lateDays, 30 - (stats.presentDays + stats.lateDays)],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Generate sample data for line chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return format(date, 'MMM dd');
  });

  const workingHoursLineData = {
    labels: last7Days,
    datasets: [
      {
        label: 'Working Hours',
        data: [8.5, 7.2, 8.1, 9.0, 7.8, 8.3, 8.7], // Sample data
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const formatWorkingHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const attendanceRate = stats.totalDays > 0
    ? Math.round(((stats.presentDays + stats.lateDays) / stats.totalDays) * 100)
    : 0;

  const punctualityRate = stats.totalDays > 0
    ? Math.round((stats.presentDays / stats.totalDays) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Track your attendance patterns and performance</p>
        </div>
        <button
          className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 
                   flex items-center space-x-2 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Date Range</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({
                  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-colors text-gray-700"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Days</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Punctuality Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{punctualityRate}%</p>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Avg. Working Hours</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.averageWorkingHours ? formatWorkingHours(stats.averageWorkingHours) : '0h 0m'}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">Attendance Overview</h3>
              </div>
              <div className="h-64">
                <Bar data={attendanceBarData} options={chartOptions} />
              </div>
            </div>

            {/* Attendance Doughnut Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900">Attendance Distribution</h3>
              </div>
              <div className="h-64 flex items-center justify-center">
                <Doughnut data={attendanceDoughnutData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Working Hours Trend */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900">Working Hours Trend (Last 7 Days)</h3>
            </div>
            <div className="h-64">
              <Line data={workingHoursLineData} options={chartOptions} />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
              <h4 className="text-lg font-medium mb-2">On Time Days</h4>
              <p className="text-3xl font-bold">{stats.presentDays}</p>
              <p className="text-green-100 text-sm">Great job maintaining punctuality!</p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-xl text-white">
              <h4 className="text-lg font-medium mb-2">Late Arrivals</h4>
              <p className="text-3xl font-bold">{stats.lateDays}</p>
              <p className="text-yellow-100 text-sm">Try to arrive on time more often</p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
              <h4 className="text-lg font-medium mb-2">Total Working Hours</h4>
              <p className="text-3xl font-bold">{formatWorkingHours(stats.totalWorkingHours)}</p>
              <p className="text-blue-100 text-sm">Keep up the good work!</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;