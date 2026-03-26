import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, FileText, Search, Pencil, Trash2, X, Save, Sparkles, AlertTriangle, Plus } from 'lucide-react';
import IconBox from '../../components/IconBox';
import { useAuth } from '../../contexts/AuthContext';
import { getSharedData, addItem, updateItem, deleteItem, subscribeToChanges } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { validateRequired, validateDate } from '../../utils/validation';
import AdminNavbar from '../../components/AdminNavbar';
import './ManageAnnouncements.css';
import '../../styles/admin-common.css';

const iconSize = 20;
const iconProps = { size: iconSize, strokeWidth: 1.8 };

const ANNOUNCEMENT_TYPES = ['General', 'Health', 'Security', 'Infrastructure', 'Emergency'];

const getTypeStyle = (type) => {
  switch (type) {
    case 'Emergency':
      return { badge: 'type-emergency', accent: '#DC2626' };
    case 'Security':
      return { badge: 'type-security', accent: '#DC2626' };
    case 'Health':
      return { badge: 'type-health', accent: '#16A34A' };
    case 'Infrastructure':
      return { badge: 'type-infrastructure', accent: '#64748B' };
    case 'General':
    default:
      return { badge: 'type-general', accent: '#3B82F6' };
  }
};

const ManageAnnouncements = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    whenDate: new Date().toISOString().split('T')[0], 
    whenTime: '',
    type: 'General'
  });
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    whenDate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const getFilteredAnnouncements = () => {
    return announcements.filter(announcement => {
      const matchesSearch = searchQuery === '' || 
        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (announcement.description && announcement.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (dateFilter === 'all') return matchesSearch;
      
      const announcementDate = new Date(announcement.whenDate || announcement.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      announcementDate.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'upcoming') {
        return matchesSearch && announcementDate >= today;
      }
      if (dateFilter === 'past') {
        return matchesSearch && announcementDate < today;
      }
      
      return matchesSearch;
    });
  };

  const getStatistics = () => {
    const total = announcements.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = announcements.filter(a => {
      const date = new Date(a.whenDate || a.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }).length;
    const past = total - upcoming;
    return { total, upcoming, past };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const titleValidation = validateRequired(formData.title, 'Title');
    if (!titleValidation.isValid) {
      newErrors.title = titleValidation.error;
    }
    
    const descriptionValidation = validateRequired(formData.description, 'Description');
    if (!descriptionValidation.isValid) {
      newErrors.description = descriptionValidation.error;
    }
    
    const dateValidation = validateDate(formData.whenDate, false);
    if (!dateValidation.isValid) {
      newErrors.whenDate = '⚠️ Invalid Date Selection: Past dates are not allowed. Please select today or a future date.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please complete all required fields correctly.', 'error');
      return;
    }
    
    try {
      if (selectedAnnouncement) {
        const updatedData = {
          ...formData,
          datePosted: selectedAnnouncement.datePosted 
        };
        updateItem('announcements', selectedAnnouncement.id, updatedData);
        showToast('Announcement updated successfully!', 'success');
      } else {
        const newAnnouncement = {
          ...formData,
          datePosted: new Date().toISOString() 
        };
        addItem('announcements', newAnnouncement);
        showToast('Announcement added successfully!', 'success');
      }
      closeModal();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showToast('Something went wrong. Please try again.', 'error');
    }
  };

  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description,
      whenDate: announcement.whenDate || announcement.date, 
      whenTime: announcement.whenTime || '',
      type: announcement.type || 'General'
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      const archivedBy = currentUser?.uid || null;
      const archivedByEmail = currentUser?.email || userProfile?.email || null;
      await deleteItem('announcements', selectedAnnouncement.id, archivedBy, archivedByEmail);
      showToast('Announcement deleted successfully!', 'success');
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showToast('Error deleting announcement', 'error');
    }
  };

  const openDeleteDialog = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteDialog(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
    setFormData({
      title: '',
      description: '',
      whenDate: new Date().toISOString().split('T')[0],
      whenTime: '',
      type: 'General'
    });
    setErrors({
      title: '',
      description: '',
      whenDate: ''
    });
  };

  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      <div className="admin-content">
        <div className="admin-container">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Manage Announcements</h1>
              <p className="admin-page-subtitle">Create, edit, and manage barangay announcements</p>
            </div>
            <button className="admin-add-btn" onClick={() => setShowModal(true)}>
              <span className="btn-icon"><Plus {...iconProps} /></span>
              Add New Announcement
            </button>
          </div>

          {/* Statistics */}
          {announcements.length > 0 && (
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <IconBox variant="blue" size="sm"><Megaphone size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().total}</div>
                  <div className="stat-label">Total Announcements</div>
                </div>
              </div>
              <div className="stat-card stat-upcoming">
                <IconBox variant="teal" size="sm"><Calendar size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().upcoming}</div>
                  <div className="stat-label">Upcoming</div>
                </div>
              </div>
              <div className="stat-card stat-past">
                <IconBox variant="gray" size="sm"><FileText size={20} strokeWidth={1.8} /></IconBox>
                <div className="stat-content">
                  <div className="stat-value">{getStatistics().past}</div>
                  <div className="stat-label">Past</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          {announcements.length > 0 && (
            <div className="filters-section">
              <div className="search-box">
                <span className="search-icon"><Search size={18} strokeWidth={1.8} /></span>
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          )}

          {/* Announcement Linear List */}
          <div className="announcement-list">
            {getFilteredAnnouncements().length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon"><Megaphone size={48} strokeWidth={1.5} /></span>
                <h3>
                  {announcements.length === 0 
                    ? 'No Announcements Yet' 
                    : 'No Announcements Match Your Filters'}
                </h3>
                <p>
                  {announcements.length === 0 
                    ? 'Click "Add New Announcement" to create your first announcement' 
                    : 'Try adjusting your search or filters.'}
                </p>
              </div>
            ) : (
              getFilteredAnnouncements().map(announcement => {
                const typeStyle = getTypeStyle(announcement.type);
                return (
                  <div
                    key={announcement.id}
                    className="announcement-list-item"
                    style={{ borderLeftColor: typeStyle.accent }}
                  >
                    {/* Header: badges + admin actions */}
                    <div className="item-header">
                      <div className="item-badges">
                        <span className={`type-badge ${typeStyle.badge}`}>
                          {announcement.type || 'General'}
                        </span>
                        {(announcement.type === 'Emergency' || announcement.type === 'Security') && (
                          <span className="type-badge type-important">Important</span>
                        )}
                      </div>
                      <div className="item-admin-actions">
                        <button
                          className="action-icon-btn edit"
                          onClick={() => handleEdit(announcement)}
                          title="Edit announcement"
                        >
                          <Pencil size={15} strokeWidth={1.8} />
                        </button>
                        <button
                          className="action-icon-btn delete"
                          onClick={() => openDeleteDialog(announcement)}
                          title="Delete announcement"
                        >
                          <Trash2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="item-title">{announcement.title}</h3>

                    {/* Description */}
                    <p className="item-description">{announcement.description}</p>

                    {/* Dates: When + Date Posted */}
                    <div className="item-dates">
                      <div className="item-date-row">
                        <span className="item-date-label">When:</span>
                        <span className="item-date-value">
                          {new Date(announcement.whenDate || announcement.date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                          {announcement.whenTime && (
                            <span className="when-time"> at {
                              new Date(`2000-01-01T${announcement.whenTime}`).toLocaleTimeString('en-US', {
                                hour: 'numeric', minute: '2-digit', hour12: true
                              })
                            }</span>
                          )}
                        </span>
                      </div>
                      {announcement.datePosted && (
                        <div className="item-date-row">
                          <span className="item-date-label">Date Posted:</span>
                          <span className="item-date-value">
                            {new Date(announcement.datePosted).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {selectedAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}
              </h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={20} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`form-input ${errors.title ? 'input-error' : ''}`}
                  placeholder="Enter announcement title"
                />
                {errors.title && (
                  <span className="field-error">{errors.title}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="form-input form-select"
                >
                  {ANNOUNCEMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <small className="form-hint">Select the category for this announcement</small>
              </div>
              <div className="form-group">
                <label className="form-label">When *</label>
                <input
                  type="date"
                  name="whenDate"
                  value={formData.whenDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={`form-input ${errors.whenDate ? 'input-error' : ''}`}
                />
                {errors.whenDate && (
                  <span className="field-error">{errors.whenDate}</span>
                )}
                <small className="form-hint">The date of the event or announcement (e.g., October 15, 2025)</small>
              </div>
              <div className="form-group">
                <label className="form-label">Time (Optional)</label>
                <input
                  type="time"
                  name="whenTime"
                  value={formData.whenTime}
                  onChange={handleChange}
                  className="form-input"
                />
                <small className="form-hint">The specific time for the event or announcement</small>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`form-textarea ${errors.description ? 'input-error' : ''}`}
                  placeholder="Enter announcement description"
                  rows="5"
                />
                {errors.description && (
                  <span className="field-error">{errors.description}</span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  <span className="btn-icon btn-icon-left"><X size={18} strokeWidth={2} /></span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedAnnouncement ? 'Update' : 'Create'} Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">
              <span className="warning-icon"><AlertTriangle size={20} strokeWidth={1.8} /></span>
              Confirm Deletion
            </h3>
            <p className="dialog-message">
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
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

export default ManageAnnouncements;
