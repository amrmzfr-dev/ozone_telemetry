import { useEffect, useState } from 'react'
import axios from 'axios'
import { format, parseISO } from 'date-fns'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Activity, 
  Clock, 
  Wifi, 
  WifiOff, 
  Database, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import './App.css'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api' })

interface DeviceStatus {
  device_id: string
  last_seen: string
  wifi_connected: boolean
  rtc_available: boolean
  sd_card_available: boolean
  current_count_basic: number
  current_count_standard: number
  current_count_premium: number
  device_timestamp: string
}

interface AnalyticsData {
  device_id: string
  period: {
    start_date: string
    end_date: string
    days: number
  }
  totals: {
    total: number
    basic: number
    standard: number
    premium: number
  }
  daily_stats: Array<{
    date: string
    basic_count: number
    standard_count: number
    premium_count: number
    total_events: number
  }>
  recent_events: Array<{
    event_type: string
    occurred_at: string
    device_timestamp: string
    count_basic: number
    count_standard: number
    count_premium: number
  }>
}

function App() {
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices/online/')
      setDevices(res.data)
      if (res.data.length > 0 && !selectedDevice) {
        setSelectedDevice(res.data[0].device_id)
      }
    } catch (e: any) {
      setError('Failed to fetch devices')
    }
  }

  const fetchAnalytics = async (deviceId: string) => {
    if (!deviceId) return
    setLoading(true)
    try {
      const res = await api.get('/events/analytics/', { 
        params: { device_id: deviceId, days: 7 } 
      })
      setAnalytics(res.data)
    } catch (e: any) {
      setError('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (deviceId: string) => {
    try {
      const response = await api.get('/export/', {
        params: { device_id: deviceId, days: 30 },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `telemetry_${deviceId}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (e: any) {
      setError('Failed to export data')
    }
  }

  useEffect(() => {
    fetchDevices()
    const interval = setInterval(fetchDevices, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedDevice) {
      fetchAnalytics(selectedDevice)
    }
  }, [selectedDevice])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  const chartData = analytics?.daily_stats.map(stat => ({
    date: format(parseISO(stat.date), 'MMM dd'),
    Basic: stat.basic_count,
    Standard: stat.standard_count,
    Premium: stat.premium_count,
    Total: stat.total_events
  })) || []

  const pieData = analytics?.totals ? [
    { name: 'Basic', value: analytics.totals.basic || 0 },
    { name: 'Standard', value: analytics.totals.standard || 0 },
    { name: 'Premium', value: analytics.totals.premium || 0 }
  ].filter(item => item.value > 0) : []

  return (
    <div className="app">
      <header className="header">
        <h1>Ozone Telemetry Dashboard</h1>
        <div className="header-actions">
          <button onClick={() => fetchDevices()} className="btn btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="dashboard">
        {/* Device Selection */}
        <div className="card">
          <h2>Select Device</h2>
          <select 
            value={selectedDevice} 
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="device-select"
          >
            <option value="">Select a device...</option>
            {devices.map(device => (
              <option key={device.device_id} value={device.device_id}>
                {device.device_id} - {device.wifi_connected ? 'Online' : 'Offline'}
              </option>
            ))}
          </select>
        </div>

        {/* Device Status Cards */}
        {devices.filter(d => d.device_id === selectedDevice).map(device => (
          <div key={device.device_id} className="device-status">
            <div className="card">
              <h3>Device Status</h3>
              <div className="status-grid">
                <div className="status-item">
                  <Wifi className={device.wifi_connected ? 'status-online' : 'status-offline'} />
                  <span>WiFi: {device.wifi_connected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="status-item">
                  <Clock className={device.rtc_available ? 'status-online' : 'status-offline'} />
                  <span>RTC: {device.rtc_available ? 'Available' : 'Unavailable'}</span>
                </div>
                <div className="status-item">
                  <Database className={device.sd_card_available ? 'status-online' : 'status-offline'} />
                  <span>SD Card: {device.sd_card_available ? 'Available' : 'Unavailable'}</span>
                </div>
                <div className="status-item">
                  <Activity className="status-online" />
                  <span>Last Seen: {format(parseISO(device.last_seen), 'MMM dd, HH:mm:ss')}</span>
                </div>
              </div>
              <div className="device-timestamp">
                Device Time: {device.device_timestamp || 'N/A'}
              </div>
            </div>

            <div className="card">
              <h3>Current Counts</h3>
              <div className="counts-grid">
                <div className="count-item basic">
                  <span className="count-label">Basic</span>
                  <span className="count-value">{device.current_count_basic}</span>
                </div>
                <div className="count-item standard">
                  <span className="count-label">Standard</span>
                  <span className="count-value">{device.current_count_standard}</span>
                </div>
                <div className="count-item premium">
                  <span className="count-label">Premium</span>
                  <span className="count-value">{device.current_count_premium}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Analytics */}
        {analytics && (
          <>
            <div className="card">
              <div className="card-header">
                <h3>Usage Analytics (Last 7 Days)</h3>
                <button 
                  onClick={() => exportData(selectedDevice)}
                  className="btn btn-primary"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              
              <div className="totals-grid">
                <div className="total-item">
                  <span className="total-label">Total Events</span>
                  <span className="total-value">{analytics.totals.total || 0}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Basic</span>
                  <span className="total-value">{analytics.totals.basic || 0}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Standard</span>
                  <span className="total-value">{analytics.totals.standard || 0}</span>
                </div>
                <div className="total-item">
                  <span className="total-label">Premium</span>
                  <span className="total-value">{analytics.totals.premium || 0}</span>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="card">
                <h3>Daily Usage Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Basic" fill="#0088FE" />
                    <Bar dataKey="Standard" fill="#00C49F" />
                    <Bar dataKey="Premium" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card">
                <h3>Usage Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Events */}
            <div className="card">
              <h3>Recent Events</h3>
              <div className="events-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event Type</th>
                      <th>Basic</th>
                      <th>Standard</th>
                      <th>Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recent_events.slice(0, 10).map((event, index) => (
                      <tr key={index}>
                        <td>{format(parseISO(event.occurred_at), 'MMM dd, HH:mm:ss')}</td>
                        <td>
                          <span className={`event-type ${event.event_type.toLowerCase()}`}>
                            {event.event_type}
                          </span>
                        </td>
                        <td>{event.count_basic}</td>
                        <td>{event.count_standard}</td>
                        <td>{event.count_premium}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="loading">
            <RefreshCw className="spinner" />
            Loading analytics...
          </div>
        )}
      </div>
    </div>
  )
}

export default App
