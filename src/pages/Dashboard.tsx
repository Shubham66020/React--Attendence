import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  Timer,
  CheckCircle,
  XCircle,
  Coffee,
  Pause,
  Play,
  Thermometer,
  Wifi,
  WifiOff,
  BarChart3,
  Activity,
  Globe,
  MapIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS } from '../config/api';

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    downlink?: number;
  };
}

interface DashboardStats {
  averageWorkingHours?: number;
  totalDays?: number;
  presentDays?: number;
  lateDays?: number;
  halfDays?: number;
  totalBreakHours?: number;
  totalOvertimeHours?: number;
  remoteDays?: number;
  punctualityRate?: number;
  totalBreaks?: number;
}

interface TodayAttendance {
  _id?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  workingHours?: number;
  breakHours?: number;
  overtimeHours?: number;
  breaks?: Array<{
    breakStart: string;
    breakEnd?: string;
    type: string;
    duration?: number;
  }>;
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
  isRemote?: boolean;
  temperature?: number;
}

interface BreakStatus {
  onBreak: boolean;
  currentBreak?: {
    breakStart: string;
    type: string;
  };
  totalBreaks: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

const Dashboard = () => {
  const { user } = useAuth(); const [stats, setStats] = useState<DashboardStats>({});
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [breakStatus, setBreakStatus] = useState<BreakStatus>({ onBreak: false, totalBreaks: 0 });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const [temperature, setTemperature] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [showAdvancedCheckIn, setShowAdvancedCheckIn] = useState(false);
  const [selectedMood, setMood] = useState<string>('neutral');
  const [productivityScore, setProductivityScore] = useState<number>(5);
  const [tasksPlanned, setTasksPlanned] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    fetchDashboardData();
    fetchBreakStatus();
    getCurrentLocation();
    initializeBatteryStatus();
    initializeNetworkStatus();
  }, []);
  const initializeBatteryStatus = async () => {
    if ('getBattery' in navigator) {
      try {
        // @ts-expect-error - getBattery is not in TypeScript definitions
        const battery = await navigator.getBattery();
        setBatteryLevel(Math.round(battery.level * 100));

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      } catch {
        console.log('Battery API not supported');
        setBatteryLevel(100); // Default value
      }
    } else {
      setBatteryLevel(100); // Default value for unsupported browsers
    }
  };

  const initializeNetworkStatus = () => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        // Try to get address from coordinates
        try {
          const response = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${position.coords.latitude}+${position.coords.longitude}&key=YOUR_API_KEY&limit=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              locationData.address = data.results[0].formatted;
            }
          }
        } catch {
          console.log('Could not get address');
        }

        setLocation(locationData);
      } catch (error) {
        console.error('Error getting location:', error);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch today's attendance
      const attendanceResponse = await fetch(API_ENDPOINTS.ATTENDANCE.TODAY, {
        credentials: 'include'
      });

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();
        setTodayAttendance(attendanceData.attendance);
      }

      // Fetch attendance stats
      const statsResponse = await fetch(API_ENDPOINTS.ATTENDANCE.STATS, {
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

  const fetchBreakStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.CURRENT_BREAK, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setBreakStatus(data);
      }
    } catch (error) {
      console.error('Error fetching break status:', error);
    }
  };
  const handleMarkAttendance = async (type: 'checkin' | 'checkout') => {
    try {
      const requestData: Record<string, unknown> = {
        type,
        location,
        isRemote: isRemoteMode,
        mood: selectedMood,
        productivity: {
          score: productivityScore,
          tasksCompleted: type === 'checkin' ? tasksPlanned : undefined
        },
        batteryLevel,
        gpsAccuracy: location?.accuracy, networkInfo: {
          connectionType: (navigator as NavigatorWithConnection).connection?.effectiveType || 'unknown',
          signalStrength: (navigator as NavigatorWithConnection).connection?.downlink || 0,
          networkName: isOnline ? 'connected' : 'offline'
        }
      };

      if (temperature) {
        requestData.temperature = parseFloat(temperature);
      }

      if (symptoms.length > 0) {
        requestData.symptoms = symptoms;
      }

      // Get weather information if available
      if (location) {
        try {
          // This would typically call a weather API
          requestData.weather = {
            condition: 'unknown',
            temperature: 20,
            humidity: 50
          };
        } catch {
          // Weather info is optional
        }
      }

      const response = await fetch(API_ENDPOINTS.ATTENDANCE.MARK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (response.ok) {
        setTodayAttendance(data.attendance);
        await fetchDashboardData();
        setShowAdvancedCheckIn(false);
        setShowHealthCheck(false);

        // Reset form
        setMood('neutral');
        setProductivityScore(5);
        setTasksPlanned(0);
        setTemperature('');
        setSymptoms([]);
      } else {
        alert(data.message || 'Error marking attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Error marking attendance');
    }
  };

  const handleBreak = async (type: 'start' | 'end', breakType: string = 'other') => {
    try {
      const response = await fetch(API_ENDPOINTS.ATTENDANCE.BREAK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type, breakType })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchBreakStatus();
        await fetchDashboardData();
      } else {
        alert(data.message || 'Error managing break');
      }
    } catch (error) {
      console.error('Error managing break:', error);
      alert('Error managing break');
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

  const getCurrentBreakDuration = () => {
    if (breakStatus.currentBreak) {
      const breakStart = new Date(breakStatus.currentBreak.breakStart);
      const now = new Date();
      const duration = Math.floor((now.getTime() - breakStart.getTime()) / (1000 * 60));
      return formatWorkingHours(duration);
    }
    return '0m';
  };

  const dashboardCards = [
    {
      title: 'Today\'s Status',
      value: todayAttendance?.status ?
        todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) :
        'Not Marked',
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
      title: 'On Time Rate',
      value: `${stats.punctualityRate || 0}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Break Time',
      value: `${stats.totalBreaks || 0} Breaks`,
      icon: Coffee,
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
            <p className="text-blue-100 flex items-center space-x-2">
              <span>{format(currentTime, 'EEEE, MMMM d, yyyy')} • {format(currentTime, 'h:mm:ss a')}</span>
              {location && (
                <span className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>Location detected</span>
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
            {/* Remote Mode Toggle */}
            <button
              onClick={() => setIsRemoteMode(!isRemoteMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${isRemoteMode ? 'bg-green-500 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'
                }`}
            >
              {isRemoteMode ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{isRemoteMode ? 'Remote' : 'Office'}</span>
            </button>

            {/* Main Action Buttons */}
            {!todayAttendance?.checkIn ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleMarkAttendance('checkin')}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Quick Check In</span>
                </button>
                <button
                  onClick={() => setShowAdvancedCheckIn(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-400 transition-colors"
                >
                  Advanced
                </button>
              </div>
            ) : !todayAttendance?.checkOut ? (
              <div className="flex space-x-2">
                {!breakStatus.onBreak ? (
                  <button
                    onClick={() => handleBreak('start', 'other')}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Take Break</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBreak('end')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>End Break</span>
                  </button>
                )}
                <button
                  onClick={() => handleMarkAttendance('checkout')}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <Clock className="h-4 w-4" />
                  <span>Check Out</span>
                </button>
              </div>
            ) : (
              <div className="bg-green-500 px-6 py-2 rounded-lg font-medium flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>Day Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>      {/* Advanced Check-in Modal */}
      {showAdvancedCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Advanced Check-in</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Mode
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setIsRemoteMode(false)}
                    className={`flex-1 p-3 rounded-lg border ${!isRemoteMode ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Globe className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Office</span>
                  </button>
                  <button
                    onClick={() => setIsRemoteMode(true)}
                    className={`flex-1 p-3 rounded-lg border ${isRemoteMode ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  >
                    <Wifi className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Remote</span>
                  </button>
                </div>
              </div>

              {/* Mood Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How are you feeling today?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { mood: 'excellent', emoji: '😃', label: 'Excellent' },
                    { mood: 'good', emoji: '😊', label: 'Good' },
                    { mood: 'neutral', emoji: '😐', label: 'Neutral' },
                    { mood: 'tired', emoji: '😴', label: 'Tired' },
                    { mood: 'stressed', emoji: '😰', label: 'Stressed' }
                  ].map(({ mood, emoji, label }) => (
                    <button
                      key={mood}
                      onClick={() => setMood(mood)}
                      className={`p-2 rounded-lg border text-center ${mood === selectedMood
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="text-lg">{emoji}</div>
                      <div className="text-xs">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Productivity Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Productivity (1-10)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={productivityScore}
                    onChange={(e) => setProductivityScore(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-medium">{productivityScore}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tasks planned for today
                </label>
                <input
                  type="number"
                  value={tasksPlanned}
                  onChange={(e) => setTasksPlanned(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => setShowHealthCheck(!showHealthCheck)}
                className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5" />
                  <span>Health Check</span>
                </span>
                <span className="text-sm text-gray-500">
                  {showHealthCheck ? 'Hide' : 'Show'}
                </span>
              </button>

              {showHealthCheck && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="37.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Any Symptoms?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Fever', 'Cough', 'Headache', 'Fatigue', 'Sore Throat', 'Nausea'].map((symptom) => (
                        <button
                          key={symptom}
                          onClick={() => {
                            setSymptoms(prev =>
                              prev.includes(symptom)
                                ? prev.filter(s => s !== symptom)
                                : [...prev, symptom]
                            );
                          }}
                          className={`p-2 text-sm rounded-lg border ${symptoms.includes(symptom)
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Device Information */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Device Status</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600">Battery:</span>
                    <span className="font-medium">{batteryLevel}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>

              {location && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Location Detected</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                  </p>
                  {location.accuracy && (
                    <p className="text-xs text-blue-600 mt-1">
                      Accuracy: ±{location.accuracy}m
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAdvancedCheckIn(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAttendance('checkin')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Check In
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Current Break Status */}
      {breakStatus.onBreak && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500 p-2 rounded-full">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-medium text-orange-900">Currently on Break</p>
                <p className="text-sm text-orange-700">
                  {breakStatus.currentBreak?.type} • Duration: {getCurrentBreakDuration()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleBreak('end')}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              End Break
            </button>
          </div>
        </div>
      )}

      {/* Today's Activity & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Today's Activity</span>
          </h3>
          <div className="space-y-4">
            {todayAttendance?.checkIn ? (
              <>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="bg-green-500 p-2 rounded-full">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Checked In</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(todayAttendance.checkIn)}
                      {todayAttendance.isRemote && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Remote
                        </span>
                      )}
                    </p>
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

                {todayAttendance?.breakHours && todayAttendance.breakHours > 0 && (
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                    <div className="bg-orange-500 p-2 rounded-full">
                      <Coffee className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Break Time</p>
                      <p className="text-sm text-gray-600">{formatWorkingHours(todayAttendance.breakHours)}</p>
                    </div>
                  </div>
                )}

                {todayAttendance?.breaks && todayAttendance.breaks.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Today's Breaks</h4>
                    <div className="space-y-2">
                      {todayAttendance.breaks.map((breakItem, index) => (
                        <div key={index} className="text-xs bg-gray-50 p-2 rounded-lg">
                          <span className="font-medium capitalize">{breakItem.type}</span>
                          <span className="text-gray-600 ml-2">
                            {formatTime(breakItem.breakStart)}
                            {breakItem.breakEnd && ` - ${formatTime(breakItem.breakEnd)}`}
                            {breakItem.duration && ` (${formatWorkingHours(breakItem.duration)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">You haven't checked in today</p>
                <button
                  onClick={() => setShowAdvancedCheckIn(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check In Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Monthly Overview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Monthly Overview</span>
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.totalDays || 0}</p>
                <p className="text-sm text-blue-800">Total Days</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.punctualityRate || 0}%</p>
                <p className="text-sm text-green-800">On Time</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Present Days</span>
                <span className="font-semibold text-green-600">{stats.presentDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Late Days</span>
                <span className="font-semibold text-orange-600">{stats.lateDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Half Days</span>
                <span className="font-semibold text-yellow-600">{stats.halfDays || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Remote Days</span>
                <span className="font-semibold text-blue-600">{stats.remoteDays || 0}</span>
              </div>
            </div>

            <div className="pt-3 border-t">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Working Hours</span>
                  <span className="font-semibold">
                    {stats.averageWorkingHours ? formatWorkingHours(stats.averageWorkingHours) : '0h 0m'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Overtime</span>
                  <span className="font-semibold text-purple-600">
                    {stats.totalOvertimeHours ? formatWorkingHours(stats.totalOvertimeHours) : '0h 0m'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Breaks</span>
                  <span className="font-semibold text-orange-600">{stats.totalBreaks || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
