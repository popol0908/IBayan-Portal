import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, FileText, Pencil, Trash2, X, Save, Sparkles, AlertTriangle, Plus, Upload, ImageIcon, Pin, Leaf, HeartPulse, ShieldAlert, CalendarHeart, HandHelping } from 'lucide-react';
import IconBox from '../../components/IconBox';
import { useAuth } from '../../contexts/AuthContext';
import { getSharedData, addItem, updateItem, deleteItem, subscribeToChanges } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { validateRequired, validateDate } from '../../utils/validation';
import AdminNavbar from '../../components/AdminNavbar';
import { db } from '../../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useSearch } from '../../contexts/SearchContext';
import { addActivityLog } from '../../services/activityLogService';
import './ManageAnnouncements.css';

const iconSize = 20;
const iconProps = { size: iconSize, strokeWidth: 1.8 };

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dypfxfpfz';
const CLOUDINARY_UPLOAD_PRESET = 'barangay_proofs';

const ANNOUNCEMENT_TYPES = ['Environment', 'Health', 'Safety', 'Events', 'Services'];

const ADMIN_CATEGORIES = ['All', 'Environment', 'Health', 'Safety', 'Events', 'Services'];

const getCategoryTabColor = (cat) => {
  switch (cat) {
    case 'All': return '#0F172A';
    case 'Environment': return '#16A34A';
    case 'Health': return '#2563EB';
    case 'Safety': return '#DC2626';
    case 'Events': return '#7C3AED';
    case 'Services': return '#EA580C';
    default: return '#0F172A';
  }
};

const getTypeStyle = (type) => {
  switch (type) {
    case 'Environment':
      return { badge: 'type-environment', border: 'border-environment', gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', icon: <Leaf size={32} strokeWidth={1.5} /> };
    case 'Health':
      return { badge: 'type-health', border: 'border-health', gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', icon: <HeartPulse size={32} strokeWidth={1.5} /> };
    case 'Safety':
      return { badge: 'type-safety', border: 'border-safety', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', icon: <ShieldAlert size={32} strokeWidth={1.5} /> };
    case 'Events':
      return { badge: 'type-events', border: 'border-events', gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)', icon: <CalendarHeart size={32} strokeWidth={1.5} /> };
    case 'Services':
      return { badge: 'type-services', border: 'border-services', gradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', icon: <HandHelping size={32} strokeWidth={1.5} /> };
    // Legacy fallbacks
    case 'Emergency':
    case 'Security':
      return { badge: 'type-safety', border: 'border-safety', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', icon: <ShieldAlert size={32} strokeWidth={1.5} /> };
    case 'Infrastructure':
      return { badge: 'type-services', border: 'border-services', gradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', icon: <HandHelping size={32} strokeWidth={1.5} /> };
    case 'General':
    default:
      return { badge: 'type-environment', border: 'border-environment', gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', icon: <Leaf size={32} strokeWidth={1.5} /> };
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
    type: 'Environment',
    pinned: false
  });
  const [errors, setErrors] = useState({
    title: '',
    description: '',
    whenDate: ''
  });
  const { searchQuery } = useSearch();
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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

      // Category filter
      const matchesCategory = categoryFilter === 'All' || announcement.type === categoryFilter;
      
      if (dateFilter === 'all') return matchesSearch && matchesCategory;
      
      const announcementDate = new Date(announcement.whenDate || announcement.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      announcementDate.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'upcoming') {
        return matchesSearch && matchesCategory && announcementDate >= today;
      }
      if (dateFilter === 'past') {
        return matchesSearch && matchesCategory && announcementDate < today;
      }
      
      return matchesSearch && matchesCategory;
    });
  };

  // Check if announcement was updated after being posted
  const hasBeenUpdated = (announcement) => {
    if (!announcement.updatedAt || !announcement.datePosted) return false;
    const posted = new Date(announcement.datePosted).getTime();
    const updated = new Date(announcement.updatedAt).getTime();
    return Math.abs(updated - posted) > 60000;
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Image upload handlers
  const validateImageFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file type. Accepted: JPG, PNG, WEBP.', 'error');
      return false;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('File size must not exceed 5MB.', 'error');
      return false;
    }
    return true;
  };

  const handleImageSelect = (file) => {
    if (!file || !validateImageFile(file)) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleImageSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageSelect(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      formData.append('folder', 'barangay_announcements');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary error:', errorData);
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image. Please try again.');
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
      setIsUploading(true);
      let imageUrl = selectedAnnouncement?.imageUrl || null;

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      // If image was cleared (preview is null but had existing image)
      if (!imagePreview && selectedAnnouncement?.imageUrl) {
        imageUrl = null;
      }

      if (selectedAnnouncement) {
        const updatedData = {
          ...formData,
          imageUrl,
          datePosted: selectedAnnouncement.datePosted 
        };
        updateItem('announcements', selectedAnnouncement.id, updatedData);
        showToast('Announcement updated successfully!', 'success');
        addActivityLog('updated', 'announcements', `Updated announcement "${formData.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      } else {
        const newAnnouncement = {
          ...formData,
          imageUrl,
          datePosted: new Date().toISOString() 
        };
        addItem('announcements', newAnnouncement);
        showToast('Announcement added successfully!', 'success');
        addActivityLog('created', 'announcements', `Created announcement "${formData.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });

        // Notify all verified residents
        try {
          const residentsSnap = await getDocs(query(collection(db, 'users'), where('status', '==', 'verified')));
          if (!residentsSnap.empty) {
            const batch = writeBatch(db);
            residentsSnap.docs.forEach((userDoc) => {
              if (userDoc.data().role === 'admin') return; // skip admins
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, {
                userId: userDoc.id,
                role: 'resident',
                title: 'New Announcement',
                message: formData.title,
                type: 'announcement',
                read: false,
                createdAt: serverTimestamp(),
                link: '/announcements',
              });
            });
            await batch.commit();
          }
        } catch (notifErr) {
          console.error('Error sending notifications:', notifErr);
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      description: announcement.description,
      whenDate: announcement.whenDate || announcement.date, 
      whenTime: announcement.whenTime || '',
      type: announcement.type || 'Environment',
      pinned: announcement.pinned || false
    });
    // Load existing image preview
    if (announcement.imageUrl) {
      setImagePreview(announcement.imageUrl);
    }
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      const archivedBy = currentUser?.uid || null;
      const archivedByEmail = currentUser?.email || userProfile?.email || null;
      await deleteItem('announcements', selectedAnnouncement.id, archivedBy, archivedByEmail);
      showToast('Announcement deleted successfully!', 'success');
      addActivityLog('deleted', 'announcements', `Deleted announcement "${selectedAnnouncement?.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
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
      type: 'Environment',
      pinned: false
    });
    setErrors({
      title: '',
      description: '',
      whenDate: ''
    });
    clearImage();
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

          {/* Existing Announcements */}
          <div className="alerts-table-card">
            <h2 className="table-card-title">Existing Announcements</h2>

            {/* Category Filter Tabs */}
            <div className="admin-category-tabs">
              {ADMIN_CATEGORIES.map(cat => {
                const isActive = categoryFilter === cat;
                const tabColor = getCategoryTabColor(cat);
                return (
                  <button
                    key={cat}
                    className={`admin-cat-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                    style={isActive ? {
                      background: tabColor,
                      borderColor: tabColor,
                      color: '#ffffff',
                      boxShadow: `0 2px 8px ${tabColor}33`
                    } : {
                      borderColor: `${tabColor}30`,
                      color: tabColor
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>


            {getFilteredAnnouncements().length === 0 ? (
              <div className="admin-ann-empty">
                <span className="admin-ann-empty-icon"><Megaphone size={48} strokeWidth={1.5} /></span>
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
              <div className="admin-ann-grid">
                {getFilteredAnnouncements().map(announcement => {
                  const typeStyle = getTypeStyle(announcement.type);
                  return (
                    <div key={announcement.id} className={`admin-ann-card ${announcement.pinned ? 'border-pinned' : typeStyle.border}`}>
                      {/* Banner Image */}
                      <div className="admin-ann-banner">
                        {announcement.imageUrl ? (
                          <img src={announcement.imageUrl} alt="" className="admin-ann-banner-img" />
                        ) : (
                          <div className="admin-ann-banner-placeholder" style={{ background: typeStyle.gradient }}>
                            <div className="admin-ann-placeholder-icon">{typeStyle.icon}</div>
                          </div>
                        )}
                        {/* Admin Actions overlay on banner */}
                        <div className="admin-ann-actions-overlay">
                          <button
                            className="admin-ann-action-btn admin-ann-edit"
                            onClick={() => handleEdit(announcement)}
                            title="Edit announcement"
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </button>
                          <button
                            className="admin-ann-action-btn admin-ann-delete"
                            onClick={() => openDeleteDialog(announcement)}
                            title="Delete announcement"
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="admin-ann-body">
                        {/* Top row: badge + pinned */}
                        <div className="admin-ann-top-row">
                          <span className={`type-badge ${typeStyle.badge}`}>
                            {announcement.type || 'Environment'}
                          </span>
                          {announcement.pinned && (
                            <span className="type-badge type-pinned">📌 Pinned</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="admin-ann-title">{announcement.title}</h3>

                        {/* Description */}
                        <p className="admin-ann-desc">{announcement.description}</p>

                        {/* Dates */}
                        <div className="admin-ann-dates">
                          <div className="admin-ann-date-row">
                            <span className="admin-ann-date-label">When:</span>
                            <span className="admin-ann-date-value">
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
                            <div className="admin-ann-date-row">
                              <span className="admin-ann-date-label">Posted:</span>
                              <span className="admin-ann-date-value">
                                {new Date(announcement.datePosted).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          {hasBeenUpdated(announcement) && (
                            <div className="admin-ann-date-row">
                              <span className="admin-ann-date-label">Updated:</span>
                              <span className="admin-ann-date-value">
                                {new Date(announcement.updatedAt).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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

              {/* Image Upload */}
              <div className="form-group">
                <label className="form-label">Cover Image (Optional)</label>
                {!imagePreview ? (
                  <div
                    className={`image-upload-zone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                    <div className="upload-zone-content">
                      <Upload size={28} strokeWidth={1.5} className="upload-icon" />
                      <p className="upload-text">Drag & drop an image here, or click to browse</p>
                      <span className="upload-hint">JPG, PNG, WEBP — max 5MB</span>
                    </div>
                  </div>
                ) : (
                  <div className="image-preview-container">
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      className="image-remove-btn"
                      onClick={clearImage}
                      title="Remove image"
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* Pinned Toggle */}
              <div className="form-group">
                <label className="pinned-toggle">
                  <input
                    type="checkbox"
                    name="pinned"
                    checked={formData.pinned}
                    onChange={handleChange}
                  />
                  <span className="pinned-toggle-slider"></span>
                  <span className="pinned-toggle-label">📌 Pin this announcement to the top</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  <span className="btn-icon btn-icon-left"><X size={18} strokeWidth={2} /></span>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : `${selectedAnnouncement ? 'Update' : 'Create'} Announcement`}
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
                <span className="btn-icon-left"><X size={18} strokeWidth={2} /></span>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <span className="btn-icon-left"><Trash2 size={18} strokeWidth={2} /></span>
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
