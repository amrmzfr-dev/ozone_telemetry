import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Building2, MapPin, Phone, User } from 'lucide-react';
import '../App.css';

const api = axios.create({ baseURL: 'http://10.172.66.5:8000/api' });

interface Outlet {
  id: number;
  name: string;
  location: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  is_active: boolean;
  machine_count: number;
  created_at: string;
  updated_at: string;
}

export default function Outlets() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    is_active: true
  });

  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const response = await api.get('/outlets/');
      setOutlets(response.data);
    } catch (err) {
      setError('Failed to fetch outlets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOutlet) {
        await api.put(`/outlets/${editingOutlet.id}/`, formData);
      } else {
        await api.post('/outlets/', formData);
      }
      setShowForm(false);
      setEditingOutlet(null);
      setFormData({
        name: '',
        location: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        is_active: true
      });
      fetchOutlets();
    } catch (err) {
      setError('Failed to save outlet');
    }
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      location: outlet.location || '',
      address: outlet.address || '',
      contact_person: outlet.contact_person || '',
      contact_phone: outlet.contact_phone || '',
      is_active: outlet.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return;
    try {
      await api.delete(`/outlets/${id}/`);
      fetchOutlets();
    } catch (err) {
      setError('Failed to delete outlet');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOutlet(null);
    setFormData({
      name: '',
      location: '',
      address: '',
      contact_person: '',
      contact_phone: '',
      is_active: true
    });
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  return (
    <div className="outlets-page">
      <header className="header">
        <h1>Outlets Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} />
          Add Outlet
        </button>
      </header>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingOutlet ? 'Edit Outlet' : 'Add New Outlet'}</h2>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label>Outlet Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  />
                </div>
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
                  {editingOutlet ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="outlets-grid">
        {loading ? (
          <div className="loading">Loading outlets...</div>
        ) : outlets.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} />
            <h3>No outlets found</h3>
            <p>Create your first outlet to get started</p>
          </div>
        ) : (
          outlets.map(outlet => (
            <div key={outlet.id} className={`card outlet-card ${!outlet.is_active ? 'inactive' : ''}`}>
              <div className="card-header">
                <h3>{outlet.name}</h3>
                <div className="card-actions">
                  <button 
                    className="btn-icon"
                    onClick={() => handleEdit(outlet)}
                    title="Edit outlet"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="btn-icon danger"
                    onClick={() => handleDelete(outlet.id)}
                    title="Delete outlet"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="outlet-details">
                {outlet.location && (
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>{outlet.location}</span>
                  </div>
                )}
                {outlet.contact_person && (
                  <div className="detail-item">
                    <User size={16} />
                    <span>{outlet.contact_person}</span>
                  </div>
                )}
                {outlet.contact_phone && (
                  <div className="detail-item">
                    <Phone size={16} />
                    <span>{outlet.contact_phone}</span>
                  </div>
                )}
                <div className="detail-item">
                  <Building2 size={16} />
                  <span>{outlet.machine_count} machine{outlet.machine_count !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {outlet.address && (
                <div className="outlet-address">
                  <strong>Address:</strong> {outlet.address}
                </div>
              )}
              <div className="outlet-status">
                <span className={`status-badge ${outlet.is_active ? 'active' : 'inactive'}`}>
                  {outlet.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
