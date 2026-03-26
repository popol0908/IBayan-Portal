import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren, CircleDot, CheckCircle, AlertCircle, Search, Trash2, X, AlertTriangle, Plus } from 'lucide-react';
import IconBox from '../../components/IconBox';
import { useAuth } from '../../contexts/AuthContext';
import { getSharedData, addItem, updateItem, deleteItem, subscribeToChanges } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { validateDate } from '../../utils/validation';
import AdminNavbar from '../../components/AdminNavbar';
import './ManageEmergencyAlerts.css';
import '../../styles/admin-common.css';

const iconProps = { size: 18, strokeWidth: 1.8 };

const ManageEmergencyAlerts = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General Alert',
    severity: 'Medium',
    status: 'Active',
    postedDate: new Date().toISOString().split('T')[0],
    postedTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    effectiveDate: ''
  });

  useEffect(() => {
    // Subscribe to real-time emergency alerts updates
    const unsubscribe = subscribeToChanges('emergencyAlerts', (data) => {
      setAlerts(data);
    });

    return () => unsubscribe();
  }, []);

  const getFilteredAlerts = () => {
    return alerts.filter(alert => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.description && alert.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
      
      // Severity filter
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  };

  const getStatistics = () => {
    const total = alerts.length;
    const active = alerts.filter(a => a.status === 'Active').length;
    const resolved = alerts.filter(a => a.status === 'Resolved').length;
    const high = alerts.filter(a => a.severity === 'High').length;
    
    return { total, active, resolved, high };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Alert title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Alert message is required';
    }

    if (formData.effectiveDate) {
      const dateValidation = validateDate(formData.effectiveDate, false);
      if (!dateValidation.isValid) {
        newErrors.effectiveDate = 'Invalid Date Selection: Past dates are not allowed. Please select today or a future date.';
      }
    } else {
      newErrors.effectiveDate = 'Effective date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fill in all required fields correctly', 'error');
      return;
    }

    try {
      addItem('emergencyAlerts', formData);
      showToast('Emergency alert created successfully!', 'success');
      closeCreateModal();
    } catch (error) {
      console.error('Error creating alert:', error);
      showToast('Error creating alert', 'error');
    }
  };

  const handleStatusChange = async (alert, newStatus) => {
    if (newStatus === alert.status) return;
    try {
      updateItem('emergencyAlerts', alert.id, { status: newStatus });
      showToast(`Alert marked as ${newStatus}!`, 'success');
    } catch (error) {
      console.error('Error updating alert:', error);
      showToast('Error updating alert', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const archivedBy = currentUser?.uid || null;
      const archivedByEmail = currentUser?.email || userProfile?.email || null;
      await deleteItem('emergencyAlerts', selectedAlert.id, archivedBy, archivedByEmail);
      showToast('Emergency alert deleted successfully!', 'success');
      setShowDeleteDialog(false);
      setSelectedAlert(null);
    } catch (error) {
      console.error('Error deleting alert:', error);
      showToast('Error deleting alert', 'error');
    }
  };

  const openDeleteDialog = (alert) => {
    setSelectedAlert(alert);
    setShowDeleteDialog(true);
  };

  const clearForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'General Alert',
      severity: 'Medium',
      status: 'Active',
      postedDate: new Date().toISOString().split('T')[0],
      postedTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
      effectiveDate: ''
    });
    setErrors({});
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    clearForm();
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'High':
        return 'severity-high';
      case 'Medium':
        return 'severity-medium';
      case 'Low':
        return 'severity-low';
      default:
        return 'severity-medium';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'Resolved':
        return 'status-resolved';
      case 'Draft':
        return 'status-draft';
      default:
        return 'status-draft';
    }
  };

  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      {}
      <div className="admin-content">
        <div className="admin-container">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Manage Emergency Alerts</h1>
              <p className="admin-page-subtitle">Create and manage emergency alerts for residents</p>
            </div>
            <button className="admin-add-btn" onClick={() => setShowCreateModal(true)}>
              <span className="btn-icon"><Plus {...iconProps} /></span>
              Create New Emergency Alert
            </button>
          </div>

          {/* Statistics */}
          <div className="stats-grid">
              <div className="stat-card stat-total">
                <IconBox variant="blue" size="sm"><Siren size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().total}</div>
                  <div className="stat-label">Total Alerts</div>
                </div>
              </div>
              <div className="stat-card stat-active">
                <IconBox variant="green" size="sm"><CircleDot size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().active}</div>
                  <div className="stat-label">Active</div>
                </div>
              </div>
              <div className="stat-card stat-resolved">
                <IconBox variant="gray" size="sm"><CheckCircle size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().resolved}</div>
                  <div className="stat-label">Resolved</div>
                </div>
              </div>
              <div className="stat-card stat-high">
                <IconBox variant="red" size="sm"><AlertCircle size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().high}</div>
                  <div className="stat-label">High Severity</div>
                </div>
              </div>
            </div>

          {/* Filters and Search */}
          <div className="filters-section">
              <div className="search-box">
                <span className="search-icon"><Search size={18} strokeWidth={1.8} /></span>
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Severity</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

          <div className="alerts-table-card">
            <h2 className="table-card-title">Existing Alerts</h2>
            <div className="table-responsive">
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Date Posted</th>
                    <th>Effective Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAlerts().length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-cell">
                        <div className="empty-table">
                          <span className="empty-icon"><Siren size={48} strokeWidth={1.5} /></span>
                          <p>
                            {alerts.length === 0 
                              ? 'No emergency alerts created yet' 
                              : 'No alerts match your filters'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredAlerts().map(alert => (
                    <tr key={alert.id}>
                      <td className="alert-title-cell">{alert.title}</td>
                      <td>
                        <span className={`severity-badge ${getSeverityClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td>{alert.postedDate}</td>
                      <td>{alert.effectiveDate || 'Not set'}</td>
                      <td className="actions-cell">
                        <select 
                          className={`status-select ${alert.status === 'Active' ? 'status-select-active' : 'status-select-done'}`}
                          value={alert.status}
                          onChange={(e) => handleStatusChange(alert, e.target.value)}
                          title="Change Status"
                        >
                          <option value="Active">Active</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                        <button className="btn btn-sm btn-danger btn-action" onClick={() => openDeleteDialog(alert)} title="Delete">
                          <span className="btn-icon"><Trash2 size={16} strokeWidth={1.8} /></span>
                        </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create New Alert Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-dialog modal-dialog-alert" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Emergency Alert</h2>
              <button className="modal-close" onClick={closeCreateModal} aria-label="Close"><X size={20} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Alert Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className={`form-input ${errors.title ? 'input-error' : ''}`}
                    placeholder="Enter alert title"
                    required
                  />
                  {errors.title && <span className="field-error">{errors.title}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alert Message</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                  placeholder="Enter detailed alert message"
                  rows="4"
                  required
                />
                {errors.description && <span className="field-error">{errors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="General Alert">General Alert</option>
                    <option value="Typhoon Warning">Typhoon Warning</option>
                    <option value="Flood Warning">Flood Warning</option>
                    <option value="Health Advisory">Health Advisory</option>
                    <option value="Utility Alert">Utility Alert</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Effective Date *</label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`form-input ${errors.effectiveDate ? 'input-error' : ''}`}
                  required
                />
                {errors.effectiveDate && (
                  <span className="field-error">{errors.effectiveDate}</span>
                )}
                <small className="form-hint">When this alert takes effect</small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={clearForm}>
                  Clear Form
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="btn-icon"><Siren {...iconProps} /></span>
                  Submit Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">
              <span className="warning-icon"><AlertTriangle size={20} strokeWidth={1.8} /></span>
              Confirm Deletion
            </h3>
            <p className="dialog-message">
              Are you sure you want to delete this emergency alert? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteDialog(false)}>
                <span className="btn-icon btn-icon-left"><X size={18} strokeWidth={2} /></span>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <span className="btn-icon btn-icon-left"><Trash2 size={18} strokeWidth={2} /></span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageEmergencyAlerts;
