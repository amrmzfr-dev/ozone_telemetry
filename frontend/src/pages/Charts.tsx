import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, differenceInCalendarDays, startOfYear, addMonths, subMonths, getDaysInMonth, getDay, startOfDay } from 'date-fns';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://10.172.66.5:8000/api' });

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

interface Machine {
  id: number;
  device_id: string;
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
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'outlet' | 'device'>('all');
  const [startDate, setStartDate] = useState<string>(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [tempStartDate, setTempStartDate] = useState<string>(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [tempEndDate, setTempEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
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
      const outletDeviceIds = outletMachines.map(m => m.device_id);
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
      setError('Failed to fetch analytics')
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
  }, [period, viewMode, selectedDevice, selectedOutlet, machines, devices, fetchAnalytics, getFilteredDevices, startDate, endDate])

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
              formatter={(value: any, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
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
              formatter={(value: any, name: string) => [value, name.replace('_', ' ').toUpperCase()]}
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
              formatter={(value: any) => [value, 'Total Treatments']}
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
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={["#3b82f6","#10b981","#f59e0b"][index % 3]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => [value, 'Treatments']} />
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
      const machine = machines.find(m => m.device_id === selectedDevice);
      return `Device: ${machine?.name || selectedDevice}`;
    }
    return 'All Data';
  };

  return (
    <div className="charts-page">
      <div className="page-header">
        <div className="header-left">
          <h1>Treatment Analytics</h1>
          <p className="page-subtitle">Detailed analysis and visualization of treatment data</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Controls */}
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
                className="change-date-btn"
                onClick={() => setShowDateModal(true)}
              >
                Change
              </button>
            </div>
          )}
          <div className="date-picker-container">
            <div className="date-range-group">
              <label>Date Range:</label>
              <div className="date-range-display">
                <div className="date-range-item">
                  <span className="date-label">From:</span>
                  <button 
                    className="date-display-btn"
                    onClick={() => {
                      setRangeSelecting('start');
                      setRangeCalendarDate(rangeStartDate);
                      setShowRangeModal(true);
                    }}
                  >
                    {format(rangeStartDate, 'dd/MM/yyyy')}
                  </button>
                </div>
                <span className="date-separator">to</span>
                <div className="date-range-item">
                  <span className="date-label">To:</span>
                  <button 
                    className="date-display-btn"
                    onClick={() => {
                      setRangeSelecting('end');
                      setRangeCalendarDate(rangeEndDate);
                      setShowRangeModal(true);
                    }}
                  >
                    {format(rangeEndDate, 'dd/MM/yyyy')}
                  </button>
                </div>
              </div>
              <div className="date-presets">
                <button
                  className="preset-btn"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setRangeStartDate(weekAgo);
                    setRangeEndDate(today);
                  }}
                >
                  Last 7 days
                </button>
                <button
                  className="preset-btn"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    setRangeStartDate(monthAgo);
                    setRangeEndDate(today);
                  }}
                >
                  Last 30 days
                </button>
                <button
                  className="preset-btn"
                  onClick={() => {
                    const today = new Date();
                    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                    setRangeStartDate(yearAgo);
                    setRangeEndDate(today);
                  }}
                >
                  Last year
                </button>
              </div>
              {period === 'custom' && (
                <div className="applied-date-range">
                  Applied: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="control-group">
          <label>Chart Type:</label>
          <div className="chart-type-buttons">
            <button
              className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
              onClick={() => setChartType('bar')}
            >
              <BarChart3 size={16} />
              Bar Chart
            </button>
            <button
              className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
            >
              <TrendingUp size={16} />
              Line Chart
            </button>
            <button
              className={`chart-type-btn ${chartType === 'line-total' ? 'active' : ''}`}
              onClick={() => setChartType('line-total')}
            >
              <Activity size={16} />
              Total Line
            </button>
            <button
              className={`chart-type-btn ${chartType === 'pie' ? 'active' : ''}`}
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon size={16} />
              Pie Chart
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>View Mode:</label>
          <div className="view-mode-buttons">
            <button
              className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('all');
                setSelectedOutlet(null);
                setSelectedDevice(null);
              }}
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
        </div>
      </div>


      {/* Filters */}
      {viewMode === 'outlet' && (
        <div className="filter-section">
          <label>Select Outlet:</label>
          <select 
            value={selectedOutlet || ''} 
            onChange={(e) => setSelectedOutlet(e.target.value ? Number(e.target.value) : null)}
            className="outlet-select"
          >
            <option value="">All Outlets</option>
            {outlets.map(outlet => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} ({outlet.location})
              </option>
            ))}
          </select>
        </div>
      )}

      {viewMode === 'device' && (
        <div className="filter-section">
          <label>Select Device:</label>
          <select 
            value={selectedDevice || ''} 
            onChange={(e) => setSelectedDevice(e.target.value || null)}
            className="device-select"
          >
            <option value="">All Devices</option>
            {machines.map(machine => (
              <option key={machine.device_id} value={machine.device_id}>
                {machine.name || machine.device_id} ({machine.outlet_name})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Cards */}
      {analytics && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">
              <Activity className="text-blue-500" />
            </div>
            <div className="summary-content">
              <h3>Total Treatments</h3>
              <p className="summary-value">{analytics.totals.total}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <Activity className="text-blue-600" />
            </div>
            <div className="summary-content">
              <h3>Basic Treatments</h3>
              <p className="summary-value">{analytics.totals.basic}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <Activity className="text-green-600" />
            </div>
            <div className="summary-content">
              <h3>Standard Treatments</h3>
              <p className="summary-value">{analytics.totals.standard}</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <Activity className="text-yellow-600" />
            </div>
            <div className="summary-content">
              <h3>Premium Treatments</h3>
              <p className="summary-value">{analytics.totals.premium}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h2>
            {chartType === 'line-total' ? 'Total Treatments Line Chart' : chartType.charAt(0).toUpperCase() + chartType.slice(1) + ' Chart'} - {getViewTitle()}
          </h2>
          <p className="chart-subtitle">
            {period === 'custom' 
              ? `Custom Range: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')} • ${chartType === 'line-total' ? lineTotalData.length : data.length} data points`
              : chartType === 'line-total' && period === 'day'
                ? `Last 7 days from ${format(new Date(selectedDate), 'dd/MM/yyyy')} • ${lineTotalData.length} data points`
                : `${period.charAt(0).toUpperCase() + period.slice(1)} view (${period === 'day' && format(new Date(selectedDate), 'dd/MM/yyyy')}${period === 'week' && `${format(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 'dd/MM')} - ${format(addDays(startOfWeek(new Date(selectedDate), { weekStartsOn: 1 }), 6), 'dd/MM')}`}${period === 'month' && format(new Date(selectedDate), 'MMMM yyyy')}${period === 'year' && format(new Date(selectedDate), 'yyyy')}) • ${chartType === 'line-total' ? lineTotalData.length : data.length} data points`
            }
          </p>
        </div>
        
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

      {/* Recent Events Table */}
      {analytics?.recent_events && analytics.recent_events.length > 0 && (
        <div className="recent-events-section">
          <h3>Recent Treatment Events</h3>
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
                </tr>
              </thead>
              <tbody>
                {analytics.recent_events.slice(0, 20).map((event, idx) => (
                  <tr key={idx}>
                    <td>{format(parseISO(event.occurred_at), 'MMM dd, HH:mm:ss')}</td>
                    <td>
                      <span className={`event-type ${event.event_type.toLowerCase()}`}>
                        {event.event_type}
                      </span>
                    </td>
                    <td>{event.count_basic}</td>
                    <td>{event.count_standard}</td>
                    <td>{event.count_premium}</td>
                    <td>N/A</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                  setTempStartDate(format(rangeStartDate, 'yyyy-MM-dd'));
                  setTempEndDate(format(rangeEndDate, 'yyyy-MM-dd'));
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charts;
