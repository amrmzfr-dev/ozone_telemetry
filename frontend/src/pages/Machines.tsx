import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Cpu, Wifi, Clock, Database, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Footer from '../components/Footer';
import '../App.css';

const api = axios.create({ baseURL: 'http://10.115.106.5:8000/api' });

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
  device_status: {
    last_seen: string;
    wifi_connected: boolean;
    rtc_available: boolean;
    sd_card_available: boolean;
    current_count_basic: number;
    current_count_standard: number;
    current_count_premium: number;
  } | null;
}

interface Outlet {
  id: number;
  name: string;
  location: string;
}

interface UnregisteredDevice {
  device_id: string;
  last_seen: string;
  wifi_connected: boolean;
  rtc_available: boolean;
  sd_card_available: boolean;
  current_count_basic: number;
  current_count_standard: number;
  current_count_premium: number;
}

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [unregisteredDevices, setUnregisteredDevices] = useState<UnregisteredDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    machine_type: 'Ozone Generator',
    is_active: true,
    installed_date: '',
    last_maintenance: '',
    notes: ''
  });
  const [registerData, setRegisterData] = useState({
    device_id: '',
    outlet_id: '',
    name: ''
  });

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const response = await api.get('/machines/');
      setMachines(response.data);
    } catch (err) {
      setError('Failed to fetch machines');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async () => {
    try {
      const response = await api.get('/outlets/?is_active=true');
      setOutlets(response.data);
    } catch (err) {
      setError('Failed to fetch outlets');
    }
  };

  const fetchUnregisteredDevices = async () => {
    try {
      const response = await api.get('/machines/unregistered/');
      setUnregisteredDevices(response.data);
    } catch (err) {
      setError('Failed to fetch unregistered devices');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        await api.put(`/machines/${editingMachine.id}/`, formData);
      }
      setShowForm(false);
      setEditingMachine(null);
      resetForm();
      fetchMachines();
    } catch (err) {
      setError('Failed to save machine');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/machines/register/', registerData);
      setShowRegisterForm(false);
      setRegisterData({ device_id: '', outlet_id: '', name: '' });
      fetchMachines();
      fetchUnregisteredDevices();
    } catch (err) {
      setError('Failed to register machine');
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setFormData({
      name: machine.name,
      machine_type: machine.machine_type,
      is_active: machine.is_active,
      installed_date: machine.installed_date || '',
      last_maintenance: machine.last_maintenance || '',
      notes: machine.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;
    try {
      await api.delete(`/machines/${id}/`);
      fetchMachines();
    } catch (err) {
      setError('Failed to delete machine');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setShowRegisterForm(false);
    setEditingMachine(null);
    setFormData({
      name: '',
      machine_type: 'Ozone Generator',
      is_active: true,
      installed_date: '',
      last_maintenance: '',
      notes: ''
    });
    setRegisterData({ device_id: '', outlet_id: '', name: '' });
  };

  const isDeviceOnline = (lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    return (now.getTime() - lastSeenDate.getTime()) < 5 * 60 * 1000; // 5 minutes
  };

  useEffect(() => {
    fetchMachines();
    fetchOutlets();
    fetchUnregisteredDevices();
  }, []);

  return (
    <div className="machines-page">
      <header className="header">
        <h1>Machines Management</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowRegisterForm(true)}
          >
            <Plus size={16} />
            Register Device
          </button>
        </div>
      </header>

      <div className="page-content">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

      {/* Register Device Modal */}
      {showRegisterForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Register New Device</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleRegister} className="form">
              <div className="form-group">
                <label>Device ID *</label>
                <select
                  value={registerData.device_id}
                  onChange={(e) => setRegisterData({...registerData, device_id: e.target.value})}
                  required
                >
                  <option value="">Select a device</option>
                  {unregisteredDevices.map(device => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_id} {isDeviceOnline(device.last_seen) ? '(Online)' : '(Offline)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Outlet *</label>
                <select
                  value={registerData.outlet_id}
                  onChange={(e) => setRegisterData({...registerData, outlet_id: e.target.value})}
                  required
                >
                  <option value="">Select an outlet</option>
                  {outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} {outlet.location && `(${outlet.location})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Machine Name</label>
                <input
                  type="text"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                  placeholder="Leave empty for auto-generated name"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Machine Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Machine</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label>Machine Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Machine Type</label>
                <input
                  type="text"
                  value={formData.machine_type}
                  onChange={(e) => setFormData({...formData, machine_type: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Installed Date</label>
                  <input
                    type="date"
                    value={formData.installed_date}
                    onChange={(e) => setFormData({...formData, installed_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Last Maintenance</label>
                  <input
                    type="date"
                    value={formData.last_maintenance}
                    onChange={(e) => setFormData({...formData, last_maintenance: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="machines-grid">
        {loading ? (
          <div className="loading">Loading machines...</div>
        ) : machines.length === 0 ? (
          <div className="empty-state">
            <Cpu size={48} />
            <h3>No machines found</h3>
            <p>Register your first machine to get started</p>
          </div>
        ) : (
          machines.map(machine => {
            const isOnline = machine.device_status ? isDeviceOnline(machine.device_status.last_seen) : false;
            return (
              <div key={machine.id} className={`card machine-card ${!machine.is_active ? 'inactive' : ''}`}>
                <div className="card-header">
                  <h3>{machine.name}</h3>
                  <div className="card-actions">
                    <button 
                      className="btn-icon"
                      onClick={() => handleEdit(machine)}
                      title="Edit machine"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-icon danger"
                      onClick={() => handleDelete(machine.id)}
                      title="Delete machine"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="machine-details">
                  <div className="detail-item">
                    <Cpu size={16} />
                    <span>{machine.device_id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="outlet-name">{machine.outlet_name}</span>
                    {machine.outlet_location && (
                      <span className="outlet-location">({machine.outlet_location})</span>
                    )}
                  </div>
                  <div className="detail-item">
                    <span className="machine-type">{machine.machine_type}</span>
                  </div>
                </div>
                {machine.device_status && (
                  <div className="device-status">
                    <div className="status-row">
                      <div className="status-item">
                        <Wifi className={machine.device_status.wifi_connected ? 'status-online' : 'status-offline'} />
                        <span>WiFi: {machine.device_status.wifi_connected ? 'Connected' : 'Disconnected'}</span>
                      </div>
                      <div className="status-item">
                        <Clock className={machine.device_status.rtc_available ? 'status-online' : 'status-offline'} />
                        <span>RTC: {machine.device_status.rtc_available ? 'Available' : 'Unavailable'}</span>
                      </div>
                    </div>
                    <div className="status-row">
                      <div className="status-item">
                        <Database className={machine.device_status.sd_card_available ? 'status-online' : 'status-offline'} />
                        <span>SD: {machine.device_status.sd_card_available ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <div className="status-item">
                        <Activity className="status-online" />
                        <span>Last Seen: {format(parseISO(machine.device_status.last_seen), 'MMM dd, HH:mm:ss')}</span>
                      </div>
                    </div>
                    <div className="counts-row">
                      <div className="count-item">
                        <span className="count-label">Basic</span>
                        <span className="count-value">{machine.device_status.current_count_basic}</span>
                      </div>
                      <div className="count-item">
                        <span className="count-label">Standard</span>
                        <span className="count-value">{machine.device_status.current_count_standard}</span>
                      </div>
                      <div className="count-item">
                        <span className="count-label">Premium</span>
                        <span className="count-value">{machine.device_status.current_count_premium}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="machine-footer">
                  <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className={`status-badge ${machine.is_active ? 'active' : 'inactive'}`}>
                    {machine.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}
