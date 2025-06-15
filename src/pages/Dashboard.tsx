import React, { useState, useEffect } from 'react';
import { 
  Clock,
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Timer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface DashboardStats {
  totalEmployees?: number;
  todayAttendance?: number;
  thisMonthAttendance?: number;
  averageWorkingHours?: number;
  totalDays?: number;
  presentDays?: number;
  lateDays?: number;
}

interface TodayAttendance {
  _id?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workingHours?: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch today's attendance
      const attendanceResponse = await fetch('http://localhost:5000/api/attendance/today', {
        credentials: 'include'
      });
      
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        setTodayAttendance(attendanceData.attendance);
      }

      // Fetch attendance stats
      const statsResponse = await fetch('http://localhost:5000/api/attendance/stats', {
        credentials: 'include'
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (type: 'checkin' | 'checkout') => {
    try {
      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (error) {
          console.error('Error getting location:', error);
          console.log('Location access denied');
        }
      }

      const response = await fetch('http://localhost:5000/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type, location })
      });

      const data = await response.json();
      
      if (response.ok) {
        setTodayAttendance(data.attendance);
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatWorkingHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const dashboardCards = [
    {
      title: 'Today\'s Status',
      value: todayAttendance?.status ? todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) : 'Not Marked',
      icon: todayAttendance?.checkIn ? CheckCircle : XCircle,
      color: todayAttendance?.checkIn ? 'text-green-600' : 'text-red-600',
      bgColor: todayAttendance?.checkIn ? 'bg-green-50' : 'bg-red-50'
    },
    {
      title: 'This Month',
      value: `${stats.totalDays || 0} Days`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'On Time',
      value: `${stats.presentDays || 0} Days`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Late Arrivals',
      value: `${stats.lateDays || 0} Days`,
      icon: Timer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name}!
            </h1>
            <p className="text-blue-100">
              {format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'h:mm:ss a')}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            {!todayAttendance?.checkIn ? (
              <button
                onClick={() => handleMarkAttendance('checkin')}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <Clock className="h-4 w-4" />
                <span>Check In</span>
              </button>
            ) : !todayAttendance?.checkOut ? (
              <button
                onClick={() => handleMarkAttendance('checkout')}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <Clock className="h-4 w-4" />
                <span>Check Out</span>
              </button>
            ) : (
              <div className="bg-green-500 px-6 py-2 rounded-lg font-medium flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Day Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-in/out Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
          <div className="space-y-4">
            {todayAttendance?.checkIn ? (
              <>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-500 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Checked In</p>
                    <p className="text-sm text-gray-600">{formatTime(todayAttendance.checkIn)}</p>
                  </div>
                </div>
                
                {todayAttendance?.checkOut ? (
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="bg-blue-500 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Checked Out</p>
                      <p className="text-sm text-gray-600">{formatTime(todayAttendance.checkOut)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="bg-gray-400 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Not Checked Out</p>
                      <p className="text-sm text-gray-600">Still working</p>
                    </div>
                  </div>
                )}
                
                {todayAttendance?.workingHours && todayAttendance.workingHours > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <div className="bg-purple-500 p-2 rounded-full">
                      <Timer className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Working Hours</p>
                      <p className="text-sm text-gray-600">{formatWorkingHours(todayAttendance.workingHours)}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">You haven't checked in today</p>
                <button
                  onClick={() => handleMarkAttendance('checkin')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check In Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Days Worked</span>
              <span className="font-semibold">{stats.totalDays || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">On Time</span>
              <span className="font-semibold text-green-600">{stats.presentDays || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Late Arrivals</span>
              <span className="font-semibold text-orange-600">{stats.lateDays || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg. Working Hours</span>
              <span className="font-semibold">{stats.averageWorkingHours ? formatWorkingHours(stats.averageWorkingHours) : '0h 0m'}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Attendance Rate</span>
                <span className="font-semibold text-blue-600">
                  {stats.totalDays ? Math.round(((stats.presentDays || 0) + (stats.lateDays || 0)) / stats.totalDays * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;