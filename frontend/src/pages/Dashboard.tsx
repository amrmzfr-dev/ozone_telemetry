import { useEffect, useState, useCallback, Fragment } from 'react'
import axios from 'axios'
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, differenceInCalendarDays, startOfYear, addMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Activity, Clock, Wifi, Database, Download, RefreshCw, AlertCircle, Building2, BarChart3 } from 'lucide-react'
import '../App.css'

const api = axios.create({ baseURL: 'http://10.172.66.5:8000/api' })

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
  period: { start_date: string; end_date: string; days: number }
  totals: { total: number; basic: number; standard: number; premium: number }
  daily_stats: Array<{ date: string; basic_count: number; standard_count: number; premium_count: number; total_events: number }>
  recent_events: Array<{ event_type: string; occurred_at: string; device_timestamp: string; count_basic: number; count_standard: number; count_premium: number }>
}

interface Outlet {
  id: number
  name: string
  location: string
  machine_count: number
}

interface Machine {
  id: number
  device_id: string
  outlet: number
  outlet_name: string
  outlet_location: string
  name: string
  is_active: boolean
  device_status: DeviceStatus | null
}

export default function Dashboard() {
  const [devices, setDevices] = useState<DeviceStatus[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'outlet' | 'device'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('week')

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices/all/')
      setDevices(res.data)
      if (res.data.length > 0 && !selectedDevice) setSelectedDevice(res.data[0].device_id)
    } catch {
      setError('Failed to fetch devices')
    }
  }, [selectedDevice])

  const fetchOutlets = useCallback(async () => {
    try {
      const res = await api.get('/outlets/?is_active=true')
      setOutlets(res.data)
    } catch {
      setError('Failed to fetch outlets')
    }
  }, [])

  const fetchMachines = useCallback(async () => {
    try {
      const res = await api.get('/machines/?is_active=true')
      setMachines(res.data)
    } catch {
      setError('Failed to fetch machines')
    }
  }, [])

  // Helper functions for filtering data
  const getFilteredMachines = useCallback(() => {
    if (viewMode === 'outlet' && selectedOutlet) {
      return machines.filter(m => m.outlet === selectedOutlet)
    }
    return machines
  }, [viewMode, selectedOutlet, machines])

  const getFilteredDevices = useCallback(() => {
    if (viewMode === 'outlet' && selectedOutlet) {
      const outletMachines = getFilteredMachines()
      const outletDeviceIds = outletMachines.map(m => m.device_id)
      return devices.filter(d => outletDeviceIds.includes(d.device_id))
    }
    return devices
  }, [viewMode, selectedOutlet, getFilteredMachines, devices])

  const getAggregatedCounts = useCallback(() => {
    const filteredDevices = getFilteredDevices()
    return {
      basic: filteredDevices.reduce((sum, d) => sum + d.current_count_basic, 0),
      standard: filteredDevices.reduce((sum, d) => sum + d.current_count_standard, 0),
      premium: filteredDevices.reduce((sum, d) => sum + d.current_count_premium, 0)
    }
  }, [getFilteredDevices])

  const navigateToCharts = () => {
    // Store current view state in sessionStorage for the Charts page
    const chartState = {
      viewMode,
      selectedOutlet,
      selectedDevice,
      period
    }
    sessionStorage.setItem('chartState', JSON.stringify(chartState))
    window.location.href = '#charts'
    // Trigger a page change event (this will be handled by the parent App component)
    window.dispatchEvent(new CustomEvent('navigateToCharts'))
  }

  const fetchAnalytics = useCallback(async (deviceId: string) => {
    if (!deviceId) return
    setLoading(true)
    try {
      const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365
      const res = await api.get('/events/analytics/', { params: { device_id: deviceId, days } })
      setAnalytics(res.data)
    } catch {
      setError('Failed to fetch analytics')
    } finally { setLoading(false) }
  }, [period])

  const fetchAggregatedAnalytics = useCallback(async () => {
    if (viewMode === 'device' && selectedDevice) {
      await fetchAnalytics(selectedDevice)
      return
    }
    
    setLoading(true)
    try {
      const days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365
      const filteredDevices = getFilteredDevices()
      
      if (filteredDevices.length === 0) {
        setAnalytics(null)
        return
      }

      // Fetch analytics for all filtered devices and aggregate them
      const analyticsPromises = filteredDevices.map(device => 
        api.get('/events/analytics/', { params: { device_id: device.device_id, days } })
      )
      
      const responses = await Promise.all(analyticsPromises)
      
      // Aggregate the data
      const aggregatedData = {
        device_id: viewMode === 'outlet' && selectedOutlet 
          ? `outlet_${selectedOutlet}` 
          : 'all_devices',
        period: {
          start_date: responses[0]?.data?.period?.start_date || '',
          end_date: responses[0]?.data?.period?.end_date || '',
          days: days
        },
        totals: {
          total: 0,
          basic: 0,
          standard: 0,
          premium: 0
        },
        daily_stats: [] as any[],
        recent_events: [] as any[]
      }

      // Aggregate totals
      responses.forEach(response => {
        if (response.data?.totals) {
          aggregatedData.totals.total += response.data.totals.total || 0
          aggregatedData.totals.basic += response.data.totals.basic || 0
          aggregatedData.totals.standard += response.data.totals.standard || 0
          aggregatedData.totals.premium += response.data.totals.premium || 0
        }
      })

      // Aggregate daily stats by date
      const dailyStatsMap = new Map()
      responses.forEach(response => {
        if (response.data?.daily_stats) {
          response.data.daily_stats.forEach((stat: any) => {
            const existing = dailyStatsMap.get(stat.date) || {
              date: stat.date,
              basic_count: 0,
              standard_count: 0,
              premium_count: 0,
              total_events: 0
            }
            existing.basic_count += stat.basic_count || 0
            existing.standard_count += stat.standard_count || 0
            existing.premium_count += stat.premium_count || 0
            existing.total_events += stat.total_events || 0
            dailyStatsMap.set(stat.date, existing)
          })
        }
      })
      aggregatedData.daily_stats = Array.from(dailyStatsMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )

      // Aggregate recent events (limit to 50 most recent)
      const allRecentEvents: any[] = []
      responses.forEach(response => {
        if (response.data?.recent_events) {
          allRecentEvents.push(...response.data.recent_events)
        }
      })
      aggregatedData.recent_events = allRecentEvents
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 50)

      setAnalytics(aggregatedData)
    } catch {
      setError('Failed to fetch aggregated analytics')
    } finally { 
      setLoading(false) 
    }
  }, [period, viewMode, selectedDevice, selectedOutlet, machines, devices, fetchAnalytics])

  const exportData = async (deviceId: string) => {
    try {
      const response = await api.get('/export/', { params: { device_id: deviceId, days: 30 }, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `telemetry_${deviceId}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click(); link.remove()
    } catch { setError('Failed to export data') }
  }

  const flushDatabase = async () => {
    if (!confirm('This will delete ALL telemetry data. Continue?')) return
    try {
      await api.post('/flush/')
      setAnalytics(null)
      await fetchDevices()
    } catch { setError('Failed to flush database') }
  }

  useEffect(() => {
    fetchDevices()
    fetchOutlets()
    fetchMachines()
    const interval = setInterval(() => {
      fetchDevices()
      fetchMachines()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchDevices, fetchOutlets, fetchMachines])

  useEffect(() => { 
    fetchAggregatedAnalytics() 
  }, [fetchAggregatedAnalytics])

  const buildChartData = (): Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> => {
    if (!analytics) return []
    const now = new Date()
    if (period === 'day') {
      // 24 hourly buckets 00:00..23:00
      const buckets = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, Total: 0, Basic: 0, Standard: 0, Premium: 0 }))
      const events = analytics.recent_events || []
      events.forEach(e => {
        const dt = parseISO(e.occurred_at)
        const hour = dt.getHours()
        if (hour >= 0 && hour < 24) {
          buckets[hour].Total += 1
          if (e.event_type === 'BASIC') buckets[hour].Basic += 1
          else if (e.event_type === 'STANDARD') buckets[hour].Standard += 1
          else if (e.event_type === 'PREMIUM') buckets[hour].Premium += 1
        }
      })
      return buckets
    }

    const stats = analytics.daily_stats || []

    if (period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      const buckets: Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> = []
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i)
        const label = format(d, 'EEE dd/MM')
        buckets.push({ label, Total: 0, Basic: 0, Standard: 0, Premium: 0 })
      }
      buckets.forEach((b, i) => {
        const d = addDays(start, i)
        const found = stats.find(s => isSameDay(parseISO(s.date), d))
        if (found) {
          b.Basic = found.basic_count || 0
          b.Standard = found.standard_count || 0
          b.Premium = found.premium_count || 0
          b.Total = found.total_events || b.Basic + b.Standard + b.Premium
        }
      })
      return buckets
    }

    if (period === 'month') {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      const days = differenceInCalendarDays(end, start) + 1
      const buckets: Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> = []
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i)
        const label = format(d, 'dd/MM')
        buckets.push({ label, Total: 0, Basic: 0, Standard: 0, Premium: 0 })
      }
      buckets.forEach((b, i) => {
        const d = addDays(start, i)
        const found = stats.find(s => isSameDay(parseISO(s.date), d))
        if (found) {
          b.Basic = found.basic_count || 0
          b.Standard = found.standard_count || 0
          b.Premium = found.premium_count || 0
          b.Total = found.total_events || b.Basic + b.Standard + b.Premium
        }
      })
      return buckets
    }

    // year: Jan..Dec of current year, aggregate per month
    if (period === 'year') {
      const start = startOfYear(now)
      const buckets: Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> = []
      for (let i = 0; i < 12; i++) {
        const d = addMonths(start, i)
        buckets.push({ label: format(d, 'MMM'), Total: 0, Basic: 0, Standard: 0, Premium: 0 })
      }
      stats.forEach(s => {
        const dt = parseISO(s.date)
        if (dt.getFullYear() === start.getFullYear()) {
          const index = dt.getMonth()
          buckets[index].Basic += s.basic_count || 0
          buckets[index].Standard += s.standard_count || 0
          buckets[index].Premium += s.premium_count || 0
          buckets[index].Total += s.total_events || (s.basic_count||0)+(s.standard_count||0)+(s.premium_count||0)
        }
      })
      return buckets
    }

    return []
  }

  const chartData = buildChartData()
  const pieData = analytics?.totals ? [
    { name: 'Basic', value: analytics.totals.basic || 0 },
    { name: 'Standard', value: analytics.totals.standard || 0 },
    { name: 'Premium', value: analytics.totals.premium || 0 }
  ].filter(i => i.value > 0) : []

  return (
    <div className="dashboard-page">
      <header className="header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <button onClick={() => fetchDevices()} className="btn btn-secondary"><RefreshCw size={16}/> Refresh</button>
          <button onClick={flushDatabase} className="btn btn-secondary" title="Delete all telemetry data">Flush DB</button>
        </div>
      </header>

      {error && (<div className="alert alert-error"><AlertCircle size={16}/> {error}</div>)}

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>View Mode</h3>
            <div className="view-mode-buttons">
              <button 
                className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('all')
                  setSelectedDevice('')
                  setSelectedOutlet(null)
                }}
              >
                All Data
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'outlet' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('outlet')
                  setSelectedDevice('')
                }}
              >
                By Outlet
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'device' ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('device')
                  setSelectedOutlet(null)
                }}
              >
                By Device
              </button>
            </div>
          </div>

          {viewMode === 'outlet' && (
            <div className="sidebar-section">
              <h3>Outlets</h3>
              <div className="device-list">
                <button 
                  className={`device-list-item ${!selectedOutlet ? 'active' : ''}`} 
                  onClick={() => setSelectedOutlet(null)}
                  title="View all outlets"
                >
                  <span className="dot all-devices"></span>
                  <span className="device-id">All Outlets</span>
                </button>
                {outlets.map(outlet => (
                  <button 
                    key={outlet.id} 
                    className={`device-list-item ${selectedOutlet === outlet.id ? 'active' : ''}`} 
                    onClick={() => setSelectedOutlet(outlet.id)}
                    title={`${outlet.name} - ${outlet.machine_count} machines`}
                  >
                    <Building2 size={16} />
                    <span className="device-id">{outlet.name}</span>
                    <span className="machine-count">({outlet.machine_count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'device' && (
            <div className="sidebar-section">
              <h3>Devices</h3>
              <div className="device-list">
                <button 
                  className={`device-list-item ${!selectedDevice ? 'active' : ''}`} 
                  onClick={() => setSelectedDevice('')}
                  title="View all devices"
                >
                  <span className="dot all-devices"></span>
                  <span className="device-id">All Devices</span>
                </button>
                {getFilteredDevices().map(d => {
                  const isOnline = d.wifi_connected && (new Date().getTime() - new Date(d.last_seen).getTime()) < 5 * 60 * 1000
                  return (
                    <button key={d.device_id} className={`device-list-item ${selectedDevice === d.device_id ? 'active' : ''}`} onClick={()=>setSelectedDevice(d.device_id)} title={d.device_id}>
                      <span className={`dot ${isOnline ? 'online':'offline'}`}></span>
                      <span className="device-id">{d.device_id}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        <main className="dashboard">
          {viewMode === 'device' && selectedDevice ? (
            devices.filter(d => d.device_id === selectedDevice).map(device => (
              <Fragment key={device.device_id}>
                <div className="card counts-card">
                  <h3>Current Counts - {device.device_id}</h3>
                  <div className="counts-grid">
                    <div className="count-item basic"><span className="count-label">Basic</span><span className="count-value">{device.current_count_basic}</span></div>
                    <div className="count-item standard"><span className="count-label">Standard</span><span className="count-value">{device.current_count_standard}</span></div>
                    <div className="count-item premium"><span className="count-label">Premium</span><span className="count-value">{device.current_count_premium}</span></div>
                  </div>
                </div>

                <div className="row row-status-analytics">
                  <div className="card device-status-card">
                    <h3>Device Status</h3>
                    <div className="status-grid">
                      <div className="status-item"><Wifi className={device.wifi_connected ? 'status-online' : 'status-offline'} /><span>WiFi: {device.wifi_connected ? 'Connected' : 'Disconnected'}</span></div>
                      <div className="status-item"><Clock className={device.rtc_available ? 'status-online' : 'status-offline'} /><span>RTC: {device.rtc_available ? 'Available' : 'Unavailable'}</span></div>
                      <div className="status-item"><Database className={device.sd_card_available ? 'status-online' : 'status-offline'} /><span>SD Card: {device.sd_card_available ? 'Available' : 'Unavailable'}</span></div>
                      <div className="status-item"><Activity className="status-online" /><span>Last Seen: {format(parseISO(device.last_seen), 'MMM dd, HH:mm:ss')}</span></div>
                    </div>
                    <div className="device-timestamp">Device Time: {device.device_timestamp || 'N/A'}</div>
                  </div>

                  <div className="card analytics-summary">
                    <div className="card-header">
                      <h3>Usage Analytics (Last 7 Days)</h3>
                      <button onClick={() => exportData(selectedDevice)} className="btn btn-primary"><Download size={16} /> Export CSV</button>
                    </div>
                    <div className="totals-grid">
                      <div className="total-item"><span className="total-label">Total Events</span><span className="total-value">{analytics?.totals?.total || 0}</span></div>
                      <div className="total-item"><span className="total-label">Basic</span><span className="total-value">{analytics?.totals?.basic || 0}</span></div>
                      <div className="total-item"><span className="total-label">Standard</span><span className="total-value">{analytics?.totals?.standard || 0}</span></div>
                      <div className="total-item"><span className="total-label">Premium</span><span className="total-value">{analytics?.totals?.premium || 0}</span></div>
                    </div>
                  </div>
                </div>
              </Fragment>
            ))
          ) : (
            <div className="card counts-card">
              <h3>
                {viewMode === 'outlet' && selectedOutlet 
                  ? `Outlet Overview - ${outlets.find(o => o.id === selectedOutlet)?.name || 'All Outlets'}`
                  : viewMode === 'outlet' 
                    ? 'All Outlets Overview'
                    : 'All Devices Overview'
                }
              </h3>
              <div className="counts-grid">
                <div className="count-item basic">
                  <span className="count-label">Total Basic Treatment</span>
                  <span className="count-value">{getAggregatedCounts().basic}</span>
                </div>
                <div className="count-item standard">
                  <span className="count-label">Total Standard Treatment</span>
                  <span className="count-value">{getAggregatedCounts().standard}</span>
                </div>
                <div className="count-item premium">
                  <span className="count-label">Total Premium Treatment</span>
                  <span className="count-value">{getAggregatedCounts().premium}</span>
                </div>
                <div className="count-item total">
                  <span className="count-label">Total Treatment</span>
                  <span className="count-value">{getAggregatedCounts().basic + getAggregatedCounts().standard + getAggregatedCounts().premium}</span>
                </div>
              </div>
            </div>
          )}

          {/* Outlet Overview for aggregated views */}
          {viewMode !== 'device' && (
            <div className="card device-status-card">
              <h3>
                {viewMode === 'outlet' && selectedOutlet 
                  ? `Outlet Overview - ${outlets.find(o => o.id === selectedOutlet)?.name || 'Selected Outlet'}`
                  : 'System Overview'
                }
              </h3>
              <div className="status-grid">
                {viewMode === 'outlet' && selectedOutlet ? (
                  <>
                    <div className="status-item">
                      <Activity className="status-online" />
                      <span>Machines: {getFilteredMachines().length}</span>
                    </div>
                    <div className="status-item">
                      <Activity className="status-online" />
                      <span>Online: {getFilteredDevices().filter(d => d.wifi_connected && (new Date().getTime() - new Date(d.last_seen).getTime()) < 5 * 60 * 1000).length}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="status-item">
                      <Building2 className="status-online" />
                      <span>Outlets: {outlets.length}</span>
                    </div>
                    <div className="status-item">
                      <Activity className="status-online" />
                      <span>Machines: {machines.length}</span>
                    </div>
                    <div className="status-item">
                      <Activity className="status-online" />
                      <span>Online: {devices.filter(d => d.wifi_connected && (new Date().getTime() - new Date(d.last_seen).getTime()) < 5 * 60 * 1000).length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="row row-charts">
            <div className="card charts-trends">
              <div className="card-header" style={{justifyContent:'space-between'}}>
                <h3>
                  Usage Trends ({period === 'day' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'Last 30 days' : 'Last 365 days'})
                  {viewMode === 'outlet' && selectedOutlet && (
                    <span className="chart-subtitle"> - {outlets.find(o => o.id === selectedOutlet)?.name || 'Selected Outlet'}</span>
                  )}
                </h3>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <select className="device-select" style={{width:200}} value={period} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setPeriod(e.target.value as 'day'|'week'|'month'|'year')} onClick={(e) => e.stopPropagation()}>
                    <option value="day">Day (24 hours)</option>
                    <option value="week">Week (Mon–Sun)</option>
                    <option value="month">Month (30 days)</option>
                    <option value="year">Year (365 days)</option>
                  </select>
                  <button className="btn btn-secondary" style={{padding: '8px 12px', fontSize: '0.9rem'}} onClick={(e) => { e.stopPropagation(); navigateToCharts(); }}>
                    <BarChart3 size={16} />
                    View Details
                  </button>
                </div>
              </div>
              {chartData.length > 0 ? (
                <div onClick={navigateToCharts} style={{cursor: 'pointer'}}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" /><YAxis /><Tooltip />
                      <Bar dataKey="Basic" fill="#0088FE" />
                      <Bar dataKey="Standard" fill="#00C49F" />
                      <Bar dataKey="Premium" fill="#FFBB28" />
                      {period !== 'day' && (<Bar dataKey="Total" fill="#4a5568" />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <div className="empty-chart-content">
                    <Activity size={48} />
                    <h4>No Data Available</h4>
                    <p>
                      {viewMode === 'outlet' && selectedOutlet 
                        ? `No usage data found for ${outlets.find(o => o.id === selectedOutlet)?.name || 'selected outlet'}`
                        : 'No usage data found for the selected period'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="card charts-pie">
              <div className="card-header" style={{justifyContent:'space-between'}}>
                <h3>Usage Distribution</h3>
                <button className="btn btn-secondary" style={{padding: '8px 12px', fontSize: '0.9rem'}} onClick={(e) => { e.stopPropagation(); navigateToCharts(); }}>
                  <BarChart3 size={16} />
                  View Details
                </button>
              </div>
              {pieData.length > 0 ? (
                <div onClick={navigateToCharts} style={{cursor: 'pointer'}}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                           label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={["#0088FE","#00C49F","#FFBB28","#FF8042"][index % 4]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <div className="empty-chart-content">
                    <Activity size={48} />
                    <h4>No Data Available</h4>
                    <p>
                      {viewMode === 'outlet' && selectedOutlet 
                        ? `No usage data found for ${outlets.find(o => o.id === selectedOutlet)?.name || 'selected outlet'}`
                        : 'No usage data found for the selected period'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card recent-events">
            <h3>
              Recent Events
              {viewMode === 'outlet' && selectedOutlet && (
                <span className="chart-subtitle"> - {outlets.find(o => o.id === selectedOutlet)?.name || 'Selected Outlet'}</span>
              )}
            </h3>
            <div className="events-table">
              <table>
                <thead><tr><th>Time</th><th>Event Type</th><th>Basic</th><th>Standard</th><th>Premium</th></tr></thead>
                <tbody>
                  {analytics && analytics.recent_events && analytics.recent_events.length > 0 ? (
                    analytics.recent_events.slice(0, 10).map((event, idx) => (
                      <tr key={idx}>
                        <td>{format(parseISO(event.occurred_at), 'MMM dd, HH:mm:ss')}</td>
                        <td><span className={`event-type ${event.event_type.toLowerCase()}`}>{event.event_type}</span></td>
                        <td>{event.count_basic}</td><td>{event.count_standard}</td><td>{event.count_premium}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-table-cell">
                        <div className="empty-table-content">
                          <Activity size={32} />
                          <span>
                            {viewMode === 'outlet' && selectedOutlet 
                              ? `No events found for ${outlets.find(o => o.id === selectedOutlet)?.name || 'selected outlet'}`
                              : 'No recent events found'
                            }
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!selectedDevice && (
            <div className="card recent-events">
              <h3>
                {viewMode === 'outlet' && selectedOutlet 
                  ? `Machines in ${outlets.find(o => o.id === selectedOutlet)?.name || 'Selected Outlet'}`
                  : viewMode === 'outlet' 
                    ? 'All Outlets - Machine Status'
                    : 'Device Status Overview'
                }
              </h3>
              <div className="events-table">
                <table>
                  <thead>
                    <tr>
                      <th>Device ID</th>
                      {viewMode === 'outlet' && <th>Outlet</th>}
                      <th>Status</th>
                      <th>Last Seen</th>
                      <th>Basic</th>
                      <th>Standard</th>
                      <th>Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewMode === 'outlet' ? (
                      getFilteredMachines().map((machine, idx) => {
                        const device = devices.find(d => d.device_id === machine.device_id)
                        if (!device) return null
                        const isOnline = device.wifi_connected && (new Date().getTime() - new Date(device.last_seen).getTime()) < 5 * 60 * 1000
                        return (
                          <tr key={idx}>
                            <td>{machine.name || machine.device_id}</td>
                            <td>{machine.outlet_name}</td>
                            <td><span className={`event-type ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'Online' : 'Offline'}</span></td>
                            <td>{format(parseISO(device.last_seen), 'MMM dd, HH:mm:ss')}</td>
                            <td>{device.current_count_basic}</td>
                            <td>{device.current_count_standard}</td>
                            <td>{device.current_count_premium}</td>
                          </tr>
                        )
                      })
                    ) : (
                      getFilteredDevices().map((device, idx) => {
                        const isOnline = device.wifi_connected && (new Date().getTime() - new Date(device.last_seen).getTime()) < 5 * 60 * 1000
                        return (
                          <tr key={idx}>
                            <td>{device.device_id}</td>
                            <td><span className={`event-type ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'Online' : 'Offline'}</span></td>
                            <td>{format(parseISO(device.last_seen), 'MMM dd, HH:mm:ss')}</td>
                            <td>{device.current_count_basic}</td>
                            <td>{device.current_count_standard}</td>
                            <td>{device.current_count_premium}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading && (<div className="loading"><RefreshCw className="spinner" /> Loading analytics...</div>)}
        </main>
      </div>
    </div>
  )
}
