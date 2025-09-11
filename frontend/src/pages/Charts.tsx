import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, differenceInCalendarDays, startOfYear, addMonths, subMonths, subDays, subYears } from 'date-fns';
import axios from 'axios';
import Footer from '../components/Footer';

const api = axios.create({ baseURL: 'http://10.115.106.5:8000/api' });

interface Device {
  device_id: string;
  last_seen: string;
  wifi_connected: boolean;
  rtc_available: boolean;
  sd_available: boolean;
}

interface Outlet {
  id: number;
  name: string;
  location: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  machine_count: number;
}

interface MachineDevice {
  id: number;
  device_id: string;
  is_active: boolean;
  assigned_date: string;
  deactivated_date: string | null;
  notes: string | null;
  device_status: Device | null;
}

interface Machine {
  id: number;
  outlet: number;
  outlet_name: string;
  outlet_location: string;
  name: string;
  machine_type: string;
  is_active: boolean;
  installed_date: string;
  last_maintenance: string;
  notes: string;
  created_at: string;
  updated_at: string;
  current_device_id: string | null;
  devices: MachineDevice[];
  current_device: MachineDevice | null;
  device_status: Device | null;
}

interface Analytics {
  device_id: string;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  totals: {
    total: number;
    basic: number;
    standard: number;
    premium: number;
  };
  daily_stats: Array<{
    date: string;
    basic_count: number;
    standard_count: number;
    premium_count: number;
    total_events: number;
  }>;
  recent_events: Array<{
    event_type: string;
    occurred_at: string;
    device_timestamp: string;
    count_basic: number;
    count_standard: number;
    count_premium: number;
    device_id?: string;
    device?: string;
  }>;
}

type Period = 'day' | 'week' | 'month' | 'year' | 'custom';
type ChartType = 'bar' | 'line' | 'pie' | 'line-total';

const Charts: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'outlet' | 'device'>('all');
  const [startDate, setStartDate] = useState<string>(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [rangeEndDate, setRangeEndDate] = useState<Date>(new Date());
  const [rangeCalendarDate, setRangeCalendarDate] = useState<Date>(new Date());
  const [rangeSelecting, setRangeSelecting] = useState<'start' | 'end'>('start');
  const [hasRangeStart, setHasRangeStart] = useState(false);
  const [hasRangeEnd, setHasRangeEnd] = useState(false);

  // Calendar component functions
  const generateCalendarDays = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const startDate = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start
    const endDate = addDays(startOfWeek(end, { weekStartsOn: 0 }), 6);
    
    const days = [];
    let current = startDate;
    
    while (current <= endDate) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isSelected = (date: Date) => {
    return isSameDay(date, new Date(selectedDate));
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === calendarDate.getMonth();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => direction === 'prev' ? addMonths(prev, -12) : addMonths(prev, 12));
  };

  // Range calendar functions
  const generateRangeCalendarDays = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const startDate = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start
    const endDate = addDays(startOfWeek(end, { weekStartsOn: 0 }), 6);
    
    const days = [];
    let current = startDate;
    
    while (current <= endDate) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return days;
  };

  const isRangeToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const isRangeStart = (date: Date) => {
    return isSameDay(date, rangeStartDate);
  };

  const isRangeEnd = (date: Date) => {
    return isSameDay(date, rangeEndDate);
  };

  const isInRange = (date: Date) => {
    return date >= rangeStartDate && date <= rangeEndDate;
  };

  const isRangeCurrentMonth = (date: Date) => {
    return date.getMonth() === rangeCalendarDate.getMonth();
  };

  const handleRangeDateSelect = (date: Date) => {
    if (rangeSelecting === 'start') {
      // If clicking on the same start date and we have a start date, deselect it
      if (hasRangeStart && isRangeStart(date)) {
        setHasRangeStart(false);
        setRangeStartDate(new Date());
        return;
      }
      setRangeStartDate(date);
      setHasRangeStart(true);
      if (date > rangeEndDate) {
        setRangeEndDate(date);
        setHasRangeEnd(true);
      }
      setRangeSelecting('end');
    } else {
      // If clicking on the same end date and we have an end date, deselect it
      if (hasRangeEnd && isRangeEnd(date)) {
        setHasRangeEnd(false);
        setRangeEndDate(new Date());
        return;
      }
      setRangeEndDate(date);
      setHasRangeEnd(true);
      if (date < rangeStartDate) {
        setRangeStartDate(date);
        setHasRangeStart(true);
      }
    }
  };

  const navigateRangeMonth = (direction: 'prev' | 'next') => {
    setRangeCalendarDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const navigateRangeYear = (direction: 'prev' | 'next') => {
    setRangeCalendarDate(prev => direction === 'prev' ? addMonths(prev, -12) : addMonths(prev, 12));
  };

  const fetchDevices = useCallback(async () => {
    try {
      const response = await api.get('/devices/all/');
      setDevices(response.data);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    }
  }, []);

  const fetchOutlets = useCallback(async () => {
    try {
      const response = await api.get('/outlets/');
      setOutlets(response.data);
    } catch (err) {
      console.error('Failed to fetch outlets:', err);
    }
  }, []);

  const fetchMachines = useCallback(async () => {
    try {
      const response = await api.get('/machines/');
      setMachines(response.data);
    } catch (err) {
      console.error('Failed to fetch machines:', err);
    }
  }, []);

  const getFilteredDevices = useCallback(() => {
    if (viewMode === 'device' && selectedDevice) {
      return devices.filter(d => d.device_id === selectedDevice);
    }
    if (viewMode === 'outlet' && selectedOutlet) {
      const outletMachines = machines.filter(m => m.outlet === selectedOutlet);
      const outletDeviceIds = outletMachines.map(m => m.current_device_id).filter(Boolean);
      return devices.filter(d => outletDeviceIds.includes(d.device_id));
    }
    return devices;
  }, [viewMode, selectedDevice, selectedOutlet, devices, machines]);

  const fetchAnalytics = useCallback(async (deviceId: string) => {
    if (!deviceId) return
    setLoading(true)
    try {
      let days: number;
      if (period === 'custom') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
      }
      const res = await api.get('/events/analytics/', { params: { device_id: deviceId, days } })
      setAnalytics(res.data)
    } catch {
      console.error('Failed to fetch analytics')
    } finally { setLoading(false) }
  }, [period, startDate, endDate])

  const fetchAggregatedAnalytics = useCallback(async () => {
    if (viewMode === 'device' && selectedDevice) {
      await fetchAnalytics(selectedDevice)
      return
    }
    
    setLoading(true)
    try {
      let days: number;
      if (period === 'custom') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        days = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
      }
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
        daily_stats: [] as Array<{
          date: string;
          basic_count: number;
          standard_count: number;
          premium_count: number;
          total_events: number;
        }>,
        recent_events: [] as Array<{
          event_type: string;
          occurred_at: string;
          device_timestamp: string;
          count_basic: number;
          count_standard: number;
          count_premium: number;
          device_id?: string;
          device?: string;
        }>
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
          response.data.daily_stats.forEach((stat: {
            date: string;
            basic_count: number;
            standard_count: number;
            premium_count: number;
            total_events: number;
          }) => {
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
      const allRecentEvents: Array<{
        event_type: string;
        occurred_at: string;
        device_timestamp: string;
        count_basic: number;
        count_standard: number;
        count_premium: number;
        device_id?: string;
        device?: string;
      }> = []
      responses.forEach((response, index) => {
        if (response.data?.recent_events) {
          // Preserve device_id information from the original device
          const deviceId = filteredDevices[index]?.device_id
          const eventsWithDeviceId = response.data.recent_events.map((event: {
            event_type: string;
            occurred_at: string;
            device_timestamp: string;
            count_basic: number;
            count_standard: number;
            count_premium: number;
          }) => ({
            ...event,
            device_id: deviceId,
            device: deviceId // Add both for compatibility
          }))
          allRecentEvents.push(...eventsWithDeviceId)
        }
      })
      aggregatedData.recent_events = allRecentEvents
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
        .slice(0, 50)

      setAnalytics(aggregatedData)
    } catch {
      console.error('Failed to fetch aggregated analytics')
    } finally { 
      setLoading(false) 
    }
  }, [period, viewMode, selectedDevice, selectedOutlet, fetchAnalytics, getFilteredDevices, startDate, endDate])

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchDevices(),
        fetchOutlets(),
        fetchMachines()
      ]);
    };
    loadData();

    // Load chart state from sessionStorage if available
    const savedChartState = sessionStorage.getItem('chartState');
    if (savedChartState) {
      try {
        const chartState = JSON.parse(savedChartState);
        setViewMode(chartState.viewMode || 'all');
        setSelectedOutlet(chartState.selectedOutlet || null);
        setSelectedDevice(chartState.selectedDevice || null);
        setPeriod(chartState.period || 'week');
        // Clear the saved state after loading
        sessionStorage.removeItem('chartState');
      } catch (err) {
        console.error('Failed to parse chart state:', err);
      }
    }
  }, [fetchDevices, fetchOutlets, fetchMachines]);

  useEffect(() => {
    if (devices.length > 0) {
      fetchAggregatedAnalytics();
    }
  }, [fetchAggregatedAnalytics, devices.length]);

  const buildChartData = (): Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> => {
    if (!analytics) return []
    const now = new Date(selectedDate)
    
    if (period === 'custom') {
      // Custom date range - generate daily data
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const buckets: Array<{ label: string; Total: number; Basic: number; Standard: number; Premium: number }> = [];
      
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const label = format(d, 'dd/MM');
        buckets.push({ label, Total: 0, Basic: 0, Standard: 0, Premium: 0 });
      }
      
      const stats = analytics.daily_stats || [];
      buckets.forEach((b, i) => {
        const d = addDays(start, i);
        const found = stats.find(s => isSameDay(parseISO(s.date), d));
        if (found) {
          b.Basic = found.basic_count || 0;
          b.Standard = found.standard_count || 0;
          b.Premium = found.premium_count || 0;
          b.Total = found.total_events || b.Basic + b.Standard + b.Premium;
        }
      });
      
      return buckets;
    }
    
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

  const buildLineTotalData = (): Array<{ label: string; Total: number }> => {
    if (!analytics) return []
    const now = new Date(selectedDate)
    
    if (period === 'custom') {
      // Custom date range - generate daily data
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const buckets: Array<{ label: string; Total: number }> = [];
      
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const label = format(d, 'dd/MM');
        buckets.push({ label, Total: 0 });
      }
      
      const stats = analytics.daily_stats || [];
      buckets.forEach((b, i) => {
        const d = addDays(start, i);
        const found = stats.find(s => isSameDay(parseISO(s.date), d));
        if (found) {
          b.Total = found.total_events || 0;
        }
      });
      return buckets;
    }

    const stats = analytics.daily_stats || [];

    if (period === 'day') {
      // For day view, show last 7 days to create a meaningful line chart
      const buckets: Array<{ label: string; Total: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(now, -i);
        const label = format(d, 'dd/MM');
        buckets.push({ label, Total: 0 });
      }
      
      buckets.forEach((b, i) => {
        const d = addDays(now, -6 + i);
        const found = stats.find(s => isSameDay(parseISO(s.date), d));
        if (found) {
          b.Total = found.total_events || 0;
        }
      });
      return buckets;
    }

    if (period === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const buckets: Array<{ label: string; Total: number }> = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const label = format(d, 'EEE dd/MM');
        buckets.push({ label, Total: 0 });
      }
      buckets.forEach((b, i) => {
        const d = addDays(start, i);
        const found = stats.find(s => isSameDay(parseISO(s.date), d));
        if (found) {
          b.Total = found.total_events || 0;
        }
      });
      return buckets;
    }

    if (period === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const days = differenceInCalendarDays(end, start) + 1;
      const buckets: Array<{ label: string; Total: number }> = [];
      
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        const label = format(d, 'dd/MM');
        buckets.push({ label, Total: 0 });
      }
      
      buckets.forEach((b, i) => {
        const d = addDays(start, i);
        const found = stats.find(s => isSameDay(parseISO(s.date), d));
        if (found) {
          b.Total = found.total_events || 0;
        }
      });
      return buckets;
    }

    if (period === 'year') {
      const buckets: Array<{ label: string; Total: number }> = [];
      for (let i = 0; i < 12; i++) {
        const d = addMonths(startOfYear(now), i);
        const label = format(d, 'MMM');
        buckets.push({ label, Total: 0 });
      }
      
      // Group stats by month
      const monthlyMap = new Map();
      stats.forEach(stat => {
        const date = parseISO(stat.date);
        const monthKey = format(date, 'MMM');
        const existing = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, existing + (stat.total_events || 0));
      });
      
      buckets.forEach(bucket => {
        bucket.Total = monthlyMap.get(bucket.label) || 0;
      });
      return buckets;
    }

    return []
  }

  const data = buildChartData();
  const lineTotalData = buildLineTotalData();
  const pieData = analytics?.totals ? [
    { name: 'Basic', value: analytics.totals.basic || 0 },
    { name: 'Standard', value: analytics.totals.standard || 0 },
    { name: 'Premium', value: analytics.totals.premium || 0 }
  ].filter(i => i.value > 0) : [];

  const renderChart = () => {

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="Basic" fill="#3b82f6" name="Basic Treatment" />
            <Bar dataKey="Standard" fill="#10b981" name="Standard Treatment" />
            <Bar dataKey="Premium" fill="#f59e0b" name="Premium Treatment" />
            {(period !== 'day') && <Bar dataKey="Total" fill="#4a5568" name="Total" />}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="linear" dataKey="Basic" stroke="#3b82f6" strokeWidth={3} name="Basic Treatment" />
            <Line type="linear" dataKey="Standard" stroke="#10b981" strokeWidth={3} name="Standard Treatment" />
            <Line type="linear" dataKey="Premium" stroke="#f59e0b" strokeWidth={3} name="Premium Treatment" />
            {(period !== 'day') && <Line type="linear" dataKey="Total" stroke="#4a5568" strokeWidth={3} name="Total" />}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line-total') {
      return (
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={lineTotalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => [value, 'Total Treatments']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Line 
              type="linear" 
              dataKey="Total" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Total Treatments" 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={500}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              outerRadius={150}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={["#3b82f6","#10b981","#f59e0b"][index % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [value, 'Treatments']} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  const getViewTitle = () => {
    if (viewMode === 'outlet' && selectedOutlet) {
      const outlet = outlets.find(o => o.id === selectedOutlet);
      return `Outlet: ${outlet?.name || 'Selected Outlet'}`;
    }
    if (viewMode === 'device' && selectedDevice) {
      const machine = machines.find(m => m.current_device_id === selectedDevice);
      return `Device: ${machine?.name || selectedDevice}`;
    }
    return 'All Data';
  };

  return (
    <div className="charts-page">
      <header className="header">
        <h1>Treatment Analytics</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="page-content">

      {/* Chart Section */}
      <h2 className="section-title">
        {chartType === 'line-total' ? 'Total Treatments Line Chart' : chartType.charAt(0).toUpperCase() + chartType.slice(1) + ' Chart'} - {getViewTitle()}
      </h2>
      
      <div className="card chart-section-card">
        {/* Chart Controls */}
        <div className="controls-section">
          <div className="control-group">
            <label>Time Period:</label>
            <div className="period-buttons">
              {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                <button
                  key={p}
                  className={`period-btn ${period === p ? 'active' : ''}`}
                  onClick={() => {
                    setPeriod(p);
                    setCalendarDate(new Date(selectedDate));
                    setShowDateModal(true);
                  }}
                >
                  <Calendar size={16} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
              <button
                className={`period-btn ${period === 'custom' ? 'active' : ''}`}
                onClick={() => setPeriod('custom')}
              >
                <Calendar size={16} />
                Custom
              </button>
            </div>
            {period !== 'custom' && (
              <div className="selected-date-display">
                <span className="date-label">Selected {period}:</span>
                <span className="date-value">
                  {period === 'day' && format(new Date(selectedDate), 'dd/MM/yyyy')}
                  {period === 'week' && `${format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'dd/MM')} - ${format(addDays(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 6), 'dd/MM/yyyy')}`}
                  {period === 'month' && format(new Date(selectedDate), 'MMMM yyyy')}
                  {period === 'year' && format(new Date(selectedDate), 'yyyy')}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCalendarDate(new Date(selectedDate));
                    setShowDateModal(true);
                  }}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {period === 'custom' && (
            <div className="control-group">
              <label>Date Range:</label>
              <div className="date-range-inputs">
                <div className="date-input-group">
                  <label>From:</label>
                  <input
                    type="date"
                    value={format(new Date(startDate), 'yyyy-MM-dd')}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                  />
                </div>
                <div className="date-input-group">
                  <label>To:</label>
                  <input
                    type="date"
                    value={format(new Date(endDate), 'yyyy-MM-dd')}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>
              <div className="quick-range-buttons">
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const today = new Date();
                    const sevenDaysAgo = subDays(today, 7);
                    setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  Last 7 days
                </button>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const today = new Date();
                    const thirtyDaysAgo = subDays(today, 30);
                    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  Last 30 days
                </button>
                <button
                  className="quick-range-btn"
                  onClick={() => {
                    const today = new Date();
                    const oneYearAgo = subYears(today, 1);
                    setStartDate(oneYearAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                >
                  Last year
                </button>
              </div>
            </div>
          )}

          <div className="control-group">
            <label>Chart Type:</label>
            <div className="chart-type-buttons">
              {(['bar', 'line', 'line-total', 'pie'] as ChartType[]).map(type => (
                <button
                  key={type}
                  className={`chart-type-btn ${chartType === type ? 'active' : ''}`}
                  onClick={() => setChartType(type)}
                >
                  {type === 'bar' && <BarChart3 size={16} />}
                  {type === 'line' && <TrendingUp size={16} />}
                  {type === 'line-total' && <Activity size={16} />}
                  {type === 'pie' && <Activity size={16} />}
                  {type === 'bar' ? 'Bar Chart' : type === 'line' ? 'Line Chart' : type === 'line-total' ? 'Total Line' : 'Pie Chart'}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>View Mode:</label>
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All Data
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'outlet' ? 'active' : ''}`}
                onClick={() => setViewMode('outlet')}
              >
                By Outlet
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'device' ? 'active' : ''}`}
                onClick={() => setViewMode('device')}
              >
                By Device
              </button>
            </div>
            {viewMode !== 'all' && (
              <div className="filter-select">
                <select
                  value={viewMode === 'outlet' ? (selectedOutlet || '') : (selectedDevice || '')}
                  onChange={(e) => {
                    if (viewMode === 'outlet') {
                      setSelectedOutlet(e.target.value ? Number(e.target.value) : null);
                    } else {
                      setSelectedDevice(e.target.value || null);
                    }
                  }}
                  className="filter-dropdown"
                >
                  <option value="">Select {viewMode === 'outlet' ? 'Outlet' : 'Device'}</option>
                  {viewMode === 'outlet' ? outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  )) : devices.map(device => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Chart Info */}
        <div className="chart-info">
          <p className="chart-subtitle">
            {period === 'custom' 
              ? `Custom Range: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')} • ${chartType === 'line-total' ? lineTotalData.length : data.length} data points`
              : chartType === 'line-total' && period === 'day'
                ? `Last 7 days from ${format(new Date(selectedDate), 'dd/MM/yyyy')} • ${lineTotalData.length} data points`
                : `${period.charAt(0).toUpperCase() + period.slice(1)} view (${period === 'day' && format(new Date(selectedDate), 'dd/MM/yyyy')}${period === 'week' && `${format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'dd/MM')} - ${format(addDays(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 6), 'dd/MM')}`}${period === 'month' && format(new Date(selectedDate), 'MMMM yyyy')}${period === 'year' && format(new Date(selectedDate), 'yyyy')}) • ${chartType === 'line-total' ? lineTotalData.length : data.length} data points`
            }
          </p>
        </div>
        
        {/* Chart */}
        <div className="chart-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading chart data...</p>
            </div>
          ) : (chartType === 'line-total' ? lineTotalData.length === 0 : data.length === 0) ? (
            <div className="empty-chart">
              <div className="empty-chart-content">
                {chartType === 'line-total' ? <Activity size={48} className="empty-icon" /> : <BarChart3 size={48} className="empty-icon" />}
                <h3>No Data Available</h3>
                <p>No treatment data found for the selected period and filters.</p>
              </div>
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>

      {/* Analytics Overview */}
      <h2 className="section-title">Analytics Overview</h2>
      
      {analytics && (
        <div className="card analytics-overview-card">
          {/* Treatment Statistics */}
          <div className="stats-section">
            <h4>Treatment Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon basic">
                  <Activity size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Basic</span>
                  <span className="stat-value">{analytics.totals.basic}</span>
                  <span className="stat-percentage">
                    {analytics.totals.total > 0 ? Math.round((analytics.totals.basic / analytics.totals.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon standard">
                  <Activity size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Standard</span>
                  <span className="stat-value">{analytics.totals.standard}</span>
                  <span className="stat-percentage">
                    {analytics.totals.total > 0 ? Math.round((analytics.totals.standard / analytics.totals.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon premium">
                  <Activity size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Premium</span>
                  <span className="stat-value">{analytics.totals.premium}</span>
                  <span className="stat-percentage">
                    {analytics.totals.total > 0 ? Math.round((analytics.totals.premium / analytics.totals.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="stat-item total">
                <div className="stat-icon total">
                  <Activity size={20} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{analytics.totals.total}</span>
                  <span className="stat-percentage">100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="performance-analysis">
            <h4>Performance Analysis</h4>
            <div className="analysis-grid">
              <div className="analysis-card">
                <h5>Daily Performance</h5>
                <div className="analysis-metrics">
                  <div className="analysis-metric">
                    <span className="metric-label">Average per Day</span>
                    <span className="metric-value">
                      {analytics.daily_stats.length > 0 
                        ? Math.round(analytics.totals.total / analytics.daily_stats.length)
                        : 0
                      }
                    </span>
                  </div>
                  <div className="analysis-metric">
                    <span className="metric-label">Peak Day</span>
                    <span className="metric-value">
                      {analytics.daily_stats.length > 0
                        ? Math.max(...analytics.daily_stats.map(day => day.total_events))
                        : 0
                      }
                    </span>
                  </div>
                  <div className="analysis-metric">
                    <span className="metric-label">Active Days</span>
                    <span className="metric-value">
                      {analytics.daily_stats.filter(day => day.total_events > 0).length}
                    </span>
                  </div>
                  <div className="analysis-metric">
                    <span className="metric-label">Efficiency Rate</span>
                    <span className="metric-value">
                      {analytics.daily_stats.length > 0
                        ? Math.round((analytics.daily_stats.filter(day => day.total_events > 0).length / analytics.daily_stats.length) * 100)
                        : 0
                      }%
                    </span>
                  </div>
                </div>
              </div>

              <div className="analysis-card">
                <h5>Treatment Distribution</h5>
                <div className="distribution-chart">
                  <div className="distribution-item">
                    <div className="distribution-bar">
                      <div 
                        className="distribution-fill basic" 
                        style={{width: `${analytics.totals.total > 0 ? (analytics.totals.basic / analytics.totals.total) * 100 : 0}%`}}
                      ></div>
                    </div>
                    <div className="distribution-label">
                      <span>Basic</span>
                      <span>{analytics.totals.basic} ({analytics.totals.total > 0 ? Math.round((analytics.totals.basic / analytics.totals.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="distribution-item">
                    <div className="distribution-bar">
                      <div 
                        className="distribution-fill standard" 
                        style={{width: `${analytics.totals.total > 0 ? (analytics.totals.standard / analytics.totals.total) * 100 : 0}%`}}
                      ></div>
                    </div>
                    <div className="distribution-label">
                      <span>Standard</span>
                      <span>{analytics.totals.standard} ({analytics.totals.total > 0 ? Math.round((analytics.totals.standard / analytics.totals.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="distribution-item">
                    <div className="distribution-bar">
                      <div 
                        className="distribution-fill premium" 
                        style={{width: `${analytics.totals.total > 0 ? (analytics.totals.premium / analytics.totals.total) * 100 : 0}%`}}
                      ></div>
                    </div>
                    <div className="distribution-label">
                      <span>Premium</span>
                      <span>{analytics.totals.premium} ({analytics.totals.total > 0 ? Math.round((analytics.totals.premium / analytics.totals.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outlet Performance Analysis */}
          {outlets.length > 0 && (
            <div className="outlet-performance">
              <h4>Outlet Performance Analysis</h4>
              <div className="outlet-grid">
                {outlets.map(outlet => {
                  // Get machines for this outlet first, then get their devices
                  const outletMachines = machines.filter(machine => machine.outlet === outlet.id);
                  const outletDevices = outletMachines.map(machine => {
                    // Get the current active device for this machine
                    const currentDevice = machine.current_device;
                    if (currentDevice) {
                      return devices.find(device => device.device_id === currentDevice.device_id);
                    }
                    return null;
                  }).filter(Boolean);
                  
                  
                  
                  
                  // Calculate outlet performance metrics from device data
                  let outletTotal = 0;
                  let outletBasic = 0;
                  let outletStandard = 0;
                  let outletPremium = 0;
                  
                  // Count events for this outlet (not sum count values)
                  outletDevices.forEach(device => {
                    if (!device) return;
                    const deviceEvents = analytics.recent_events?.filter(event => 
                      event.device_id === device.device_id || event.device === device.device_id
                    ) || [];
                    
                    // Count events by type, not sum count values
                    const deviceTotal = deviceEvents.length;
                    const deviceBasic = deviceEvents.filter(event => event.event_type === 'BASIC').length;
                    const deviceStandard = deviceEvents.filter(event => event.event_type === 'STANDARD').length;
                    const devicePremium = deviceEvents.filter(event => event.event_type === 'PREMIUM').length;
                    
                    outletTotal += deviceTotal;
                    outletBasic += deviceBasic;
                    outletStandard += deviceStandard;
                    outletPremium += devicePremium;
                  });
                  
                  // Calculate performance score (0-100)
                  const avgDaily = analytics.daily_stats.length > 0 ? analytics.totals.total / analytics.daily_stats.length : 0;
                  const outletDaily = analytics.daily_stats.length > 0 ? outletTotal / analytics.daily_stats.length : 0;
                  const performanceScore = avgDaily > 0 ? Math.min(100, Math.round((outletDaily / avgDaily) * 100)) : 0;
                  
                  return (
                    <div key={outlet.id} className="outlet-card">
                      <div className="outlet-header">
                        <h5>{outlet.name}</h5>
                        <div className={`performance-badge ${performanceScore >= 80 ? 'excellent' : performanceScore >= 60 ? 'good' : performanceScore >= 40 ? 'average' : 'poor'}`}>
                          {performanceScore}%
                        </div>
                      </div>
                      <div className="outlet-metrics">
                        <div className="outlet-metric">
                          <span className="metric-label">Total Treatments</span>
                          <span className="metric-value">{outletTotal}</span>
                        </div>
                        <div className="outlet-metric">
                          <span className="metric-label">Daily Average</span>
                          <span className="metric-value">{Math.round(outletDaily)}</span>
                        </div>
                        <div className="outlet-metric">
                          <span className="metric-label">Machines</span>
                          <span className="metric-value">{outletMachines.length}</span>
                        </div>
                        <div className="outlet-metric">
                          <span className="metric-label">Location</span>
                          <span className="metric-value">{outlet.location}</span>
                        </div>
                      </div>
                      <div className="outlet-breakdown">
                        <div className="breakdown-item">
                          <span className="breakdown-label">Basic</span>
                          <span className="breakdown-value">{outletBasic}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Standard</span>
                          <span className="breakdown-value">{outletStandard}</span>
                        </div>
                        <div className="breakdown-item">
                          <span className="breakdown-label">Premium</span>
                          <span className="breakdown-value">{outletPremium}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Device Performance Analysis */}
          {devices.length > 0 && (
            <div className="device-performance">
              <h4>Device Performance Analysis</h4>
              <div className="device-grid">
                {devices.map(device => {
                  const isOnline = device.wifi_connected && (new Date().getTime() - new Date(device.last_seen).getTime()) < 5 * 60 * 1000;
                  const deviceEvents = analytics.recent_events?.filter(event => 
                    event.device_id === device.device_id || event.device === device.device_id
                  ) || [];
                  const deviceTotal = deviceEvents.length;
                  
                  return (
                    <div key={device.device_id} className="device-card">
                      <div className="device-header">
                        <h5>{device.device_id}</h5>
                        <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                      <div className="device-metrics">
                        <div className="device-metric">
                          <span className="metric-label">Total Events</span>
                          <span className="metric-value">{deviceTotal}</span>
                        </div>
                        <div className="device-metric">
                          <span className="metric-label">Last Seen</span>
                          <span className="metric-value">{format(parseISO(device.last_seen), 'MMM dd, HH:mm')}</span>
                        </div>
                        <div className="device-metric">
                          <span className="metric-label">Uptime</span>
                          <span className="metric-value">
                            {isOnline ? '100%' : '0%'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Events Table */}
      {analytics?.recent_events && analytics.recent_events.length > 0 && (
        <>
          <h2 className="section-title">Recent Treatment Events</h2>
          <div className="card recent-events-card">
            <div className="events-table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event Type</th>
                    <th>Basic</th>
                    <th>Standard</th>
                    <th>Premium</th>
                    <th>Device</th>
                    <th>Machine</th>
                    <th>Outlet</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_events.slice(0, 20).map((event, idx) => {
                    // Find the machine for this device
                    const machine = machines.find(m => 
                      m.devices?.some((d: MachineDevice) => d.device_id === event.device_id) ||
                      m.current_device_id === event.device_id
                    );
                    const machineName = machine?.name || 'Unknown';
                    const outletName = machine?.outlet_name || 'Unknown';
                    
                    return (
                      <tr key={idx}>
                        <td>{format(parseISO(event.occurred_at), 'MMM dd, HH:mm:ss')}</td>
                        <td>
                          <span className={`event-type ${event.event_type.toLowerCase()}`}>
                            {event.event_type}
                          </span>
                        </td>
                        <td>{event.count_basic || 0}</td>
                        <td>{event.count_standard || 0}</td>
                        <td>{event.count_premium || 0}</td>
                        <td>{event.device_id || event.device || 'Unknown'}</td>
                        <td>{machineName}</td>
                        <td>{outletName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Date Selection Modal */}
      {showDateModal && (
        <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
          <div className={`modal ${period === 'day' ? 'calendar-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select {period.charAt(0).toUpperCase() + period.slice(1)}</h3>
              {period === 'day' && (
                <div className="selected-date-info">
                  Selected: {format(new Date(selectedDate), 'dd/MM/yyyy')}
                </div>
              )}
              <button 
                className="close-btn"
                onClick={() => setShowDateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              {period === 'day' && (
                <div className="calendar-container">
                  <div className="calendar-header">
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('prev')}
                    >
                      ‹‹
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('prev')}
                    >
                      ‹
                    </button>
                    <div className="calendar-month-year">
                      <select 
                        value={calendarDate.getMonth()}
                        onChange={(e) => setCalendarDate(new Date(calendarDate.getFullYear(), parseInt(e.target.value)))}
                        className="month-select"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {format(new Date(2024, i), 'MMM')}
                          </option>
                        ))}
                      </select>
                      <select 
                        value={calendarDate.getFullYear()}
                        onChange={(e) => setCalendarDate(new Date(parseInt(e.target.value), calendarDate.getMonth()))}
                        className="year-select"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('next')}
                    >
                      ›
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('next')}
                    >
                      ››
                    </button>
                  </div>
                  <div className="calendar-grid">
                    <div className="calendar-weekdays">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="calendar-weekday">{day}</div>
                      ))}
                    </div>
                    <div className="calendar-days">
                      {generateCalendarDays(calendarDate).map((date, index) => (
                        <button
                          key={index}
                          className={`calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isSelected(date) ? 'selected' : ''}`}
                          onClick={() => handleDateSelect(date)}
                        >
                          {date.getDate()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {period === 'week' && (
                <div className="calendar-container">
                  <div className="calendar-header">
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('prev')}
                    >
                      ‹‹
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('prev')}
                    >
                      ‹
                    </button>
                    <div className="calendar-month-year">
                      <select 
                        value={calendarDate.getMonth()}
                        onChange={(e) => setCalendarDate(new Date(calendarDate.getFullYear(), parseInt(e.target.value)))}
                        className="month-select"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {format(new Date(2024, i), 'MMM')}
                          </option>
                        ))}
                      </select>
                      <select 
                        value={calendarDate.getFullYear()}
                        onChange={(e) => setCalendarDate(new Date(parseInt(e.target.value), calendarDate.getMonth()))}
                        className="year-select"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('next')}
                    >
                      ›
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('next')}
                    >
                      ››
                    </button>
                  </div>
                  <div className="calendar-grid">
                    <div className="calendar-weekdays">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="calendar-weekday">{day}</div>
                      ))}
                    </div>
                    <div className="calendar-days">
                      {generateCalendarDays(calendarDate).map((date, index) => {
                        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
                        const weekEnd = addDays(weekStart, 6);
                        const isSelectedWeek = isSameDay(weekStart, startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }));
                        const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
                        
                        return (
                          <button
                            key={index}
                            className={`calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isSelectedWeek ? 'selected-week' : ''} ${isCurrentWeek ? 'current-week' : ''}`}
                            onClick={() => setSelectedDate(format(date, 'yyyy-MM-dd'))}
                            title={`Week: ${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="week-preview">
                    Selected Week: {format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'dd/MM/yyyy')} - {format(addDays(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 6), 'dd/MM/yyyy')}
                  </div>
                </div>
              )}
              {period === 'month' && (
                <div className="calendar-container">
                  <div className="calendar-header">
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('prev')}
                    >
                      ‹‹
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('prev')}
                    >
                      ‹
                    </button>
                    <div className="calendar-month-year">
                      <select 
                        value={calendarDate.getMonth()}
                        onChange={(e) => setCalendarDate(new Date(calendarDate.getFullYear(), parseInt(e.target.value)))}
                        className="month-select"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {format(new Date(2024, i), 'MMM')}
                          </option>
                        ))}
                      </select>
                      <select 
                        value={calendarDate.getFullYear()}
                        onChange={(e) => setCalendarDate(new Date(parseInt(e.target.value), calendarDate.getMonth()))}
                        className="year-select"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateMonth('next')}
                    >
                      ›
                    </button>
                    <button 
                      className="calendar-nav-btn"
                      onClick={() => navigateYear('next')}
                    >
                      ››
                    </button>
                  </div>
                  <div className="month-grid">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(calendarDate.getFullYear(), i, 1);
                      const isSelected = monthDate.getMonth() === new Date(selectedDate).getMonth() && 
                                       monthDate.getFullYear() === new Date(selectedDate).getFullYear();
                      return (
                        <button
                          key={i}
                          className={`month-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedDate(format(monthDate, 'yyyy-MM-dd'))}
                        >
                          {format(monthDate, 'MMM')}
                        </button>
                      );
                    })}
                  </div>
                  <div className="month-preview">
                    Selected: {format(new Date(selectedDate), 'MMMM yyyy')}
                  </div>
                </div>
              )}
              {period === 'year' && (
                <div className="date-picker-modal">
                  <label>Select Year:</label>
                  <select
                    value={format(new Date(selectedDate), 'yyyy')}
                    onChange={(e) => setSelectedDate(e.target.value + '-01-01')}
                    className="year-select"
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                  <div className="year-preview">
                    Year: {format(new Date(selectedDate), 'yyyy')}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowDateModal(false);
                  fetchAggregatedAnalytics();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Selection Modal */}
      {showRangeModal && (
        <div className="modal-overlay" onClick={() => setShowRangeModal(false)}>
          <div className="modal calendar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select {rangeSelecting === 'start' ? 'Start' : 'End'} Date</h3>
              <div className="range-selection-info">
                <div className="range-dates">
                  <span className="range-date-item">
                    From: <strong className={hasRangeStart ? 'selected' : 'not-selected'}>
                      {hasRangeStart ? format(rangeStartDate, 'dd/MM/yyyy') : 'Not selected'}
                    </strong>
                  </span>
                  <span className="range-date-item">
                    To: <strong className={hasRangeEnd ? 'selected' : 'not-selected'}>
                      {hasRangeEnd ? format(rangeEndDate, 'dd/MM/yyyy') : 'Not selected'}
                    </strong>
                  </span>
                </div>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowRangeModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="calendar-container">
                <div className="calendar-header">
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateRangeYear('prev')}
                  >
                    ‹‹
                  </button>
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateRangeMonth('prev')}
                  >
                    ‹
                  </button>
                  <div className="calendar-month-year">
                    <select 
                      value={rangeCalendarDate.getMonth()}
                      onChange={(e) => setRangeCalendarDate(new Date(rangeCalendarDate.getFullYear(), parseInt(e.target.value)))}
                      className="month-select"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {format(new Date(2024, i), 'MMM')}
                        </option>
                      ))}
                    </select>
                    <select 
                      value={rangeCalendarDate.getFullYear()}
                      onChange={(e) => setRangeCalendarDate(new Date(parseInt(e.target.value), rangeCalendarDate.getMonth()))}
                      className="year-select"
                    >
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - 5 + i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateRangeMonth('next')}
                  >
                    ›
                  </button>
                  <button 
                    className="calendar-nav-btn"
                    onClick={() => navigateRangeYear('next')}
                  >
                    ››
                  </button>
                </div>
                <div className="calendar-grid">
                  <div className="calendar-weekdays">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                      <div key={day} className="calendar-weekday">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-days">
                    {generateRangeCalendarDays(rangeCalendarDate).map((date, index) => (
                      <button
                        key={index}
                        className={`calendar-day ${!isRangeCurrentMonth(date) ? 'other-month' : ''} ${isRangeToday(date) ? 'today' : ''} ${isRangeStart(date) ? 'range-start' : ''} ${isRangeEnd(date) ? 'range-end' : ''} ${isInRange(date) ? 'in-range' : ''}`}
                        onClick={() => handleRangeDateSelect(date)}
                      >
                        {date.getDate()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRangeModal(false)}
              >
                Cancel
              </button>
              {(hasRangeStart || hasRangeEnd) && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    setHasRangeStart(false);
                    setHasRangeEnd(false);
                    setRangeStartDate(new Date());
                    setRangeEndDate(new Date());
                    setRangeSelecting('start');
                  }}
                >
                  Clear
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowRangeModal(false);
                  setStartDate(format(rangeStartDate, 'yyyy-MM-dd'));
                  setEndDate(format(rangeEndDate, 'yyyy-MM-dd'));
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Charts;
