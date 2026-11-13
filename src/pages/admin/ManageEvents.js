import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Calendar, Users, X, Pencil, Trash2, ChevronUp, ChevronDown,
  ClipboardList, FileText, User, Clock, Hash, AlertTriangle, Printer,
  CalendarHeart, Filter, CheckCircle
} from '../../components/Icons';
import { useReactToPrint } from 'react-to-print';
import IconBox from '../../components/IconBox';
import { useAuth } from '../../contexts/AuthContext';
import { addItem, updateItem, deleteItem, subscribeToChanges, subscribeToFilteredData } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { validateRequired, validateDate } from '../../utils/validation';
import AdminNavbar from '../../components/AdminNavbar';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useSearch } from '../../contexts/SearchContext';
import EventPrintView from './EventPrintView';
import { addActivityLog } from '../../services/activityLogService';
import './ManageEvents.css';
import '../../styles/admin-common.css';

const iconProps = { size: 18, strokeWidth: 1.8 };

const ManageEvents = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().split('T')[0],
    eventDateEnd: '',
    eventTime: '',
    eventTimeEnd: '',
    location: '',
    registrationFields: []
  });
  const [errors, setErrors] = useState({});
  const { searchQuery } = useSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    required: false,
    options: '',
    currentOption: ''
  });
  const [userProfiles, setUserProfiles] = useState({});

  // Print
  const eventPrintRef = useRef();
  const handleEventPrint = useReactToPrint({
    contentRef: eventPrintRef,
    documentTitle: selectedEvent ? `Event-${selectedEvent.title}` : 'Event',
  });

  useEffect(() => {
    // Subscribe to real-time events updates
    const unsubscribeEvents = subscribeToChanges('events', (data) => {
      setEvents(data);
    });

    // Subscribe to real-time registrations
    const unsubscribeRegistrations = subscribeToChanges('eventRegistrations', (data) => {
      setRegistrations(data);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeRegistrations();
    };
  }, []);

  const getFilteredEvents = () => {
    return events.filter(event => {
      const matchesSearch = searchQuery === '' || 
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (statusFilter === 'all') return matchesSearch;
      
      const eventDate = new Date(event.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
      if (statusFilter === 'upcoming') {
        return matchesSearch && eventDate >= today;
      }
      if (statusFilter === 'past') {
        return matchesSearch && eventDate < today;
      }
      
      return matchesSearch;
    });
  };

  const getEventRegistrations = (eventId) => {
    return registrations.filter(reg => reg.eventId === eventId);
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

  const handleAddField = () => {
    if (!newField.label.trim()) {
      showToast('Please enter a field label', 'error');
      return;
    }

    if (newField.type === 'dropdown' && !newField.options.trim()) {
      showToast('Please enter dropdown options (comma-separated)', 'error');
      return;
    }

    const field = {
      id: `field-${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
      options: newField.type === 'dropdown' 
        ? newField.options.split(',').map(opt => opt.trim()).filter(opt => opt)
        : []
    };

    setFormData(prev => ({
      ...prev,
      registrationFields: [...prev.registrationFields, field]
    }));

    setNewField({
      label: '',
      type: 'text',
      required: false,
      options: '',
      currentOption: ''
    });
  };

  const handleRemoveField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      registrationFields: prev.registrationFields.filter(f => f.id !== fieldId)
    }));
  };

  const handleMoveField = (fieldId, direction) => {
    const fields = [...formData.registrationFields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if (direction === 'up' && index > 0) {
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
    }
    
    setFormData(prev => ({
      ...prev,
      registrationFields: fields
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    const titleValidation = validateRequired(formData.title, 'Title');
    if (!titleValidation.isValid) {
      newErrors.title = titleValidation.error;
    }

    const dateValidation = validateDate(formData.eventDate, false);
    if (!dateValidation.isValid) {
      newErrors.eventDate = dateValidation.error;
    }

    const validateTimeRange = (timeStr) => {
      if (!timeStr) return true;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return (hours >= 7 && (hours < 19 || (hours === 19 && minutes === 0)));
    };

    if (formData.eventTime && !validateTimeRange(formData.eventTime)) {
      newErrors.eventTime = "Time must be within office hours (7:00 AM – 7:00 PM) only.";
    }
    
    if (formData.eventTimeEnd && !validateTimeRange(formData.eventTimeEnd)) {
      newErrors.eventTimeEnd = "Time must be within office hours (7:00 AM – 7:00 PM) only.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Duplicate Event Validation
    const isDuplicate = events.some(ev => 
      ev.title.trim().toLowerCase() === formData.title.trim().toLowerCase() && 
      ev.eventDate === formData.eventDate &&
      (!selectedEvent || ev.id !== selectedEvent.id)
    );

    if (isDuplicate) {
      showToast('A record with the same title and date already exists. Please review before submitting.', 'error');
      return;
    }

    try {
      if (selectedEvent) {
        // Update existing event
        await updateItem('events', selectedEvent.id, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        showToast('Event updated successfully!', 'success');
        addActivityLog('updated', 'events', `Updated event "${formData.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      } else {
        // Create new event
        await addItem('events', {
          ...formData,
          createdBy: currentUser?.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast('Event created successfully!', 'success');
        addActivityLog('created', 'events', `Created event "${formData.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });

        // Notify all verified residents
        try {
          const residentsSnap = await getDocs(query(collection(db, 'users'), where('status', '==', 'verified')));
          if (!residentsSnap.empty) {
            const batch = writeBatch(db);
            residentsSnap.docs.forEach((userDoc) => {
              if (userDoc.data().role === 'admin') return;
              const notifRef = doc(collection(db, 'notifications'));
              batch.set(notifRef, {
                userId: userDoc.id,
                role: 'resident',
                title: 'New Event',
                message: formData.title,
                type: 'event',
                read: false,
                createdAt: serverTimestamp(),
                link: '/events',
              });
            });
            await batch.commit();
          }
        } catch (notifErr) {
          console.error('Error sending event notifications:', notifErr);
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
      showToast('Failed to save event. Please try again.', 'error');
    }
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      eventDate: event.eventDate || new Date().toISOString().split('T')[0],
      eventDateEnd: event.eventDateEnd || '',
      eventTime: event.eventTime || '',
      eventTimeEnd: event.eventTimeEnd || '',
      location: event.location || '',
      registrationFields: event.registrationFields || []
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      const archivedBy = currentUser?.uid || null;
      const archivedByEmail = currentUser?.email || userProfile?.email || null;
      
      // Delete all registrations for this event (will be archived first)
      const eventRegistrations = getEventRegistrations(selectedEvent.id);
      for (const reg of eventRegistrations) {
        await deleteItem('eventRegistrations', reg.id, archivedBy, archivedByEmail);
      }

      // Delete the event (will be archived first)
      await deleteItem('events', selectedEvent.id, archivedBy, archivedByEmail);
      showToast('Event deleted successfully!', 'success');
      addActivityLog('deleted', 'events', `Deleted event "${selectedEvent?.title}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      setShowDeleteDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('Failed to delete event. Please try again.', 'error');
    }
  };

  const handleViewRegistrations = async (event) => {
    setSelectedEvent(event);
    setShowRegistrationsModal(true);

    // Fetch profiles for all registrants
    const eventRegs = registrations.filter(r => r.eventId === event.id);
    const profiles = { ...userProfiles };
    for (const reg of eventRegs) {
      if (reg.userId && !profiles[reg.userId]) {
        try {
          const userDoc = await getDoc(doc(db, 'users', reg.userId));
          if (userDoc.exists()) {
            profiles[reg.userId] = userDoc.data();
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
    }
    setUserProfiles(profiles);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventDate: new Date().toISOString().split('T')[0],
      eventDateEnd: '',
      eventTime: '',
      eventTimeEnd: '',
      location: '',
      registrationFields: []
    });
    setSelectedEvent(null);
    setErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openDeleteDialog = (event) => {
    setSelectedEvent(event);
    setShowDeleteDialog(true);
  };

  const getEventStatus = (event) => {
    const eventDate = new Date(event.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate < today) return 'past';
    if (eventDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const filteredEvents = getFilteredEvents();
  const eventRegistrations = selectedEvent ? getEventRegistrations(selectedEvent.id) : [];

  return (
    <div className="admin-dashboard">
      <AdminNavbar />
      <div className="admin-content">
        <div className="manage-events-page">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Events & Programs</h1>
              <p className="admin-page-subtitle">Manage community events and programs</p>
            </div>
            <button className="admin-add-btn" onClick={openCreateModal}>
              <span className="btn-icon"><Plus {...iconProps} /></span>
              Create Event
            </button>
          </div>

          {/* ── 3 Stat Cards (Special Categories Demographics Style) ── */}
          {(() => {
            const totalCount = events.length;
            const upcomingCount = events.filter(e => getEventStatus(e) === 'upcoming' || getEventStatus(e) === 'today').length;
            const pastCount = events.filter(e => getEventStatus(e) === 'past').length;

            return (
              <div className="sc-kpi-grid">
                <div
                  className={`sc-kpi-card sc-kpi-blue ${statusFilter === 'all' ? 'sc-kpi-active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                  title="Show all events"
                >
                  <div className="sc-kpi-top">
                    <div className="sc-kpi-icon sc-kpi-icon-blue">
                      <Calendar size={20} strokeWidth={2} />
                    </div>
                    <span className="sc-kpi-badge">Total</span>
                  </div>
                  <div className="sc-kpi-num">{totalCount}</div>
                  <div className="sc-kpi-title">Total Events</div>
                  <div className="sc-kpi-pct">All community programs</div>
                </div>

                <div
                  className={`sc-kpi-card sc-kpi-teal ${statusFilter === 'upcoming' ? 'sc-kpi-active' : ''}`}
                  onClick={() => setStatusFilter(prev => prev === 'upcoming' ? 'all' : 'upcoming')}
                  title="Click to filter by upcoming events"
                >
                  <div className="sc-kpi-top">
                    <div className="sc-kpi-icon sc-kpi-icon-teal">
                      <CalendarHeart size={20} strokeWidth={2} />
                    </div>
                    <span className="sc-kpi-badge">Upcoming</span>
                  </div>
                  <div className="sc-kpi-num">{upcomingCount}</div>
                  <div className="sc-kpi-title">Upcoming & Ongoing</div>
                  <div className="sc-kpi-pct">
                    {totalCount > 0
                      ? `${((upcomingCount / totalCount) * 100).toFixed(0)}% of total programs`
                      : 'Active & scheduled'}
                  </div>
                </div>

                <div
                  className={`sc-kpi-card sc-kpi-amber ${statusFilter === 'past' ? 'sc-kpi-active' : ''}`}
                  onClick={() => setStatusFilter(prev => prev === 'past' ? 'all' : 'past')}
                  title="Click to filter by past events"
                >
                  <div className="sc-kpi-top">
                    <div className="sc-kpi-icon sc-kpi-icon-amber">
                      <Clock size={20} strokeWidth={2} />
                    </div>
                    <span className="sc-kpi-badge">Past</span>
                  </div>
                  <div className="sc-kpi-num">{pastCount}</div>
                  <div className="sc-kpi-title">Past Events</div>
                  <div className="sc-kpi-pct">
                    {totalCount > 0
                      ? `${((pastCount / totalCount) * 100).toFixed(0)}% of total programs`
                      : 'Concluded programs'}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Events Card Section ── */}
          <div className="alerts-table-card events-table-card">
            <div className="table-card-header">
              <div className="table-card-title-group">
                <h2 className="table-card-title">Existing Events & Programs</h2>
                <span className="table-card-count">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {/* Status Filter Dropdown */}
              <div className="ann-date-filter-wrap">
                <span className="ann-date-filter-label">
                  <Filter size={13} strokeWidth={2} /> Filter:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="ann-date-filter-select"
                >
                  <option value="all">All Events</option>
                  <option value="upcoming">Upcoming & Ongoing</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="admin-filter-tabs">
              <button
                className={`admin-filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <Calendar size={13} strokeWidth={2} />
                <span>All Events</span>
                <span className="admin-filter-tab-count">{events.length}</span>
              </button>
              <button
                className={`admin-filter-tab tab-teal ${statusFilter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setStatusFilter('upcoming')}
              >
                <CalendarHeart size={13} strokeWidth={2} />
                <span>Upcoming & Ongoing</span>
                <span className="admin-filter-tab-count">
                  {events.filter(e => getEventStatus(e) === 'upcoming' || getEventStatus(e) === 'today').length}
                </span>
              </button>
              <button
                className={`admin-filter-tab tab-amber ${statusFilter === 'past' ? 'active' : ''}`}
                onClick={() => setStatusFilter('past')}
              >
                <Clock size={13} strokeWidth={2} />
                <span>Past</span>
                <span className="admin-filter-tab-count">
                  {events.filter(e => getEventStatus(e) === 'past').length}
                </span>
              </button>
            </div>

          {/* Existing Events & Programs */}
          <div className="events-card-list">
            {filteredEvents.length === 0 ? (
              <div className="admin-card empty-state-card">
                <div className="empty-state">
                  <div className="empty-icon"><Calendar size={48} strokeWidth={1.5} /></div>
                  <h3>No Events Found</h3>
                  <p>Create your first event to get started.</p>
                </div>
              </div>
            ) : (
              filteredEvents.map((event) => {
                const eventRegs = getEventRegistrations(event.id);
                const status = getEventStatus(event);
                const statusColorMap = {
                  past: 'gray',
                  upcoming: 'teal',
                  today: 'green'
                };
                const accentColor = statusColorMap[status];

                return (
                  <div key={event.id} className={`admin-card event-horizontal-card accent-${accentColor}`}>
                    <div className="event-card-content">
                      <div className="event-card-header">
                        <div className="event-title-wrap">
                          <h3 className="event-title">{event.title}</h3>
                          <span className={`badge-pill badge-${accentColor}`}>
                            {status === 'upcoming' ? 'Upcoming' : status === 'today' ? 'Ongoing' : 'Past'}
                          </span>
                        </div>
                        {event.description && (
                          <p className="event-description">{event.description}</p>
                        )}
                      </div>
                      
                      <div className="event-card-details">
                        <div className="event-pill">
                          <Calendar size={14} strokeWidth={2} />
                          <span>
                            {new Date(event.eventDate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                            {event.eventDateEnd && (
                              <> to {new Date(event.eventDateEnd).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric'
                              })}</>  
                            )}
                          </span>
                        </div>
                        {event.eventTime && (
                          <div className="event-pill">
                            <Clock size={14} strokeWidth={2} />
                            <span>
                              {event.eventTime}
                              {event.eventTimeEnd && (
                                <> to {event.eventTimeEnd}</>  
                              )}
                            </span>
                          </div>
                        )}
                        {event.location && (
                          <div className="event-pill">
                            <span style={{display: 'inline-flex', marginTop: '-2px'}}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
                            <span>{event.location}</span>
                          </div>
                        )}
                        <button className="badge-pill badge-blue event-reg-btn" onClick={() => handleViewRegistrations(event)}>
                          <Users size={14} strokeWidth={2} style={{marginRight: '4px'}} />
                          {eventRegs.length} Registered
                        </button>
                      </div>
                    </div>
                    <div className="event-card-actions">
                      <button className="action-icon-btn edit" onClick={() => handleEdit(event)} title="Edit event">
                        <Pencil size={16} strokeWidth={1.8} />
                      </button>
                      <button className="action-icon-btn delete" onClick={() => openDeleteDialog(event)} title="Delete event">
                        <Trash2 size={16} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal-dialog large-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">
                    {selectedEvent ? 'Edit Event' : 'Create New Event'}
                  </h2>
                  <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close"><X size={20} strokeWidth={2} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      className={`form-input ${errors.title ? 'input-error' : ''}`}
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter event title"
                    />
                    {errors.title && <span className="field-error">{errors.title}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      className="form-textarea"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter event description"
                      rows="3"
                    />
                  </div>

                    <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Start Date *</label>
                      <input
                        type="date"
                        name="eventDate"
                        className={`form-input ${errors.eventDate ? 'input-error' : ''}`}
                        value={formData.eventDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {errors.eventDate && <span className="field-error">{errors.eventDate}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">End Date (Optional)</label>
                      <input
                        type="date"
                        name="eventDateEnd"
                        className="form-input"
                        value={formData.eventDateEnd}
                        onChange={handleChange}
                        min={formData.eventDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Start Time (Optional)</label>
                      <input
                        type="time"
                        name="eventTime"
                        className={`form-input ${errors.eventTime ? 'input-error' : ''}`}
                        value={formData.eventTime}
                        onChange={handleChange}
                        min="07:00"
                        max="19:00"
                      />
                      {errors.eventTime && <span className="field-error">{errors.eventTime}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">End Time (Optional)</label>
                      <input
                        type="time"
                        name="eventTimeEnd"
                        className={`form-input ${errors.eventTimeEnd ? 'input-error' : ''}`}
                        value={formData.eventTimeEnd}
                        onChange={handleChange}
                        min="07:00"
                        max="19:00"
                      />
                      {errors.eventTimeEnd && <span className="field-error">{errors.eventTimeEnd}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      name="location"
                      className="form-input"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Enter event location"
                    />
                  </div>

                  {/* Registration Form Builder */}
                  <div className="form-section">
                    <div className="section-header">
                      <div>
                        <h3 className="section-title">
                          <span className="section-icon"><FileText size={20} strokeWidth={1.8} /></span>
                          Registration Form Fields
                        </h3>
                        <p className="section-description">
                          Customize the registration form that residents will fill out when registering for this event.
                        </p>
                      </div>
                    </div>

                    {/* Add New Field */}
                    <div className="field-builder-card">
                      <h4 className="field-builder-title">Add New Field</h4>
                      <div className="field-builder-form">
                        <div className="field-builder-group">
                          <label className="field-builder-label">Field Label *</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Full Name, School, Contact Number"
                            value={newField.label}
                            onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                          />
                        </div>
                        <div className="field-builder-group">
                          <label className="field-builder-label">Field Type *</label>
                          <select
                            className="form-select"
                            value={newField.type}
                            onChange={(e) => setNewField({ ...newField, type: e.target.value, options: '', currentOption: '' })}
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                        </div>
                        {newField.type === 'dropdown' && (
                          <div className="field-builder-group full-width dropdown-options-container">
                            <label className="field-builder-label">
                              <span className="dropdown-icon"><ClipboardList size={18} strokeWidth={1.8} /></span>
                              Dropdown Options *
                            </label>
                            <div className="dropdown-input-wrapper">
                              <input
                                type="text"
                                className="form-input dropdown-options-input"
                                placeholder="Type an option and press Enter or click Add"
                                value={newField.currentOption || ''}
                                onChange={(e) => setNewField({ ...newField, currentOption: e.target.value })}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    e.preventDefault();
                                    const options = newField.options ? newField.options.split(',').map(o => o.trim()).filter(o => o) : [];
                                    if (!options.includes(e.target.value.trim())) {
                                      const newOptions = [...options, e.target.value.trim()].join(', ');
                                      setNewField({ ...newField, options: newOptions, currentOption: '' });
                                    } else {
                                      setNewField({ ...newField, currentOption: '' });
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="btn-add-option"
                                onClick={() => {
                                  if (newField.currentOption && newField.currentOption.trim()) {
                                    const options = newField.options ? newField.options.split(',').map(o => o.trim()).filter(o => o) : [];
                                    if (!options.includes(newField.currentOption.trim())) {
                                      const newOptions = [...options, newField.currentOption.trim()].join(', ');
                                      setNewField({ ...newField, options: newOptions, currentOption: '' });
                                    } else {
                                      setNewField({ ...newField, currentOption: '' });
                                    }
                                  }
                                }}
                                disabled={!newField.currentOption || !newField.currentOption.trim()}
                              >
                                ➕ Add
                              </button>
                            </div>
                            {newField.options && newField.options.split(',').map(o => o.trim()).filter(o => o).length > 0 && (
                              <div className="dropdown-options-preview">
                                <div className="options-preview-header">
                                  <span className="options-count">
                                    {newField.options.split(',').map(o => o.trim()).filter(o => o).length} option(s) added
                                  </span>
                                </div>
                                <div className="options-tags">
                                  {newField.options.split(',').map((option, index) => {
                                    const trimmedOption = option.trim();
                                    if (!trimmedOption) return null;
                                    return (
                                      <div key={index} className="option-tag">
                                        <span className="option-tag-text">{trimmedOption}</span>
                                        <button
                                          type="button"
                                          className="option-tag-remove"
                                          aria-label="Remove option"
                                          onClick={() => {
                                            const options = newField.options.split(',').map(o => o.trim()).filter(o => o);
                                            options.splice(index, 1);
                                            setNewField({ ...newField, options: options.join(', ') });
                                          }}
                                        >
                                          <X size={14} strokeWidth={2} />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            <small className="field-hint">
                              Tip: Type an option and press Enter or click "Add" to add it to the list
                            </small>
                          </div>
                        )}
                        <div className="field-builder-group checkbox-group">
                          <label className="checkbox-label-large">
                            <input
                              type="checkbox"
                              checked={newField.required}
                              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                            />
                            <span>Required Field</span>
                          </label>
                        </div>
                        <div className="field-builder-group button-group">
                            <button
                              type="button"
                              className="btn btn-primary btn-add-field"
                              onClick={handleAddField}
                            >
                              <span className="btn-icon-left"><Plus size={18} strokeWidth={1.8} /></span>
                              Add Field
                            </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Fields */}
                    {formData.registrationFields.length > 0 ? (
                      <div className="fields-list-container">
                        <div className="fields-list-header">
                          <h4 className="fields-list-title">
                            Form Fields ({formData.registrationFields.length})
                          </h4>
                          <p className="fields-list-subtitle">Drag or use arrows to reorder fields</p>
                        </div>
                        <div className="fields-list">
                          {formData.registrationFields.map((field, index) => (
                            <div key={field.id} className="field-item">
                              <div className="field-item-number">{index + 1}</div>
                              <div className="field-info">
                                <div className="field-main-info">
                                  <span className="field-label">{field.label}</span>
                                  <div className="field-badges">
                                    <span className="field-type-badge">{field.type}</span>
                                    {field.required && <span className="required-badge">Required</span>}
                                  </div>
                                </div>
                                {field.type === 'dropdown' && field.options.length > 0 && (
                                  <div className="field-options-display">
                                    <strong>Options:</strong> {field.options.join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="field-actions">
                                <button
                                  type="button"
                                  className="action-icon-btn btn-move"
                                  onClick={() => handleMoveField(field.id, 'up')}
                                  disabled={index === 0}
                                  title="Move up"
                                >
                                  <ChevronUp size={18} strokeWidth={1.8} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn btn-move"
                                  onClick={() => handleMoveField(field.id, 'down')}
                                  disabled={index === formData.registrationFields.length - 1}
                                  title="Move down"
                                >
                                  <ChevronDown size={18} strokeWidth={1.8} />
                                </button>
                                <button
                                  type="button"
                                  className="action-icon-btn delete"
                                  onClick={() => handleRemoveField(field.id)}
                                  title="Remove field"
                                >
                                  <Trash2 size={18} strokeWidth={1.8} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="no-fields-message">
                        <div className="no-fields-icon"><ClipboardList size={48} strokeWidth={1.5} /></div>
                        <p>No registration fields added yet. Add fields above to create a custom registration form.</p>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {selectedEvent ? 'Update Event' : 'Create Event'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Registrations Modal */}
          {showRegistrationsModal && selectedEvent && (
            <div className="modal-overlay" onClick={() => setShowRegistrationsModal(false)}>
              <div className="modal-dialog large-modal registrations-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header registrations-modal-header">
                  <div className="registrations-header-content">
                    <h2 className="modal-title">
                      <span className="modal-title-icon"><ClipboardList size={24} strokeWidth={1.8} /></span>
                      {selectedEvent.title}
                    </h2>
                    <div className="registrations-stats">
                      <div className="stat-badge">
                        <span className="stat-badge-icon"><Users size={20} strokeWidth={1.8} /></span>
                        <span className="stat-badge-value">{eventRegistrations.length}</span>
                        <span className="stat-badge-label">Registered</span>
                      </div>
                    </div>
                  </div>
                  <button className="modal-close" onClick={() => setShowRegistrationsModal(false)} aria-label="Close"><X size={20} strokeWidth={2} /></button>
                </div>
                <div className="modal-body registrations-modal-body">
                  {eventRegistrations.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"><Users size={48} strokeWidth={1.5} /></div>
                      <h3>No Registrations Yet</h3>
                      <p>No residents have registered for this event.</p>
                    </div>
                  ) : (
                    <>
                      <div className="registrations-summary">
                        <div className="summary-stat-card">
                          <div className="summary-stat-icon blue">
                            <Users size={20} strokeWidth={1.8} />
                          </div>
                          <div className="summary-stat-info">
                            <span className="summary-stat-value">{eventRegistrations.length}</span>
                            <span className="summary-stat-label">Total Registrations</span>
                          </div>
                        </div>
                        <div className="summary-stat-card">
                          <div className="summary-stat-icon green">
                            <Calendar size={20} strokeWidth={1.8} />
                          </div>
                          <div className="summary-stat-info">
                            <span className="summary-stat-value">
                              {new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="summary-stat-label">Event Date</span>
                          </div>
                        </div>
                      </div>
                      <div className="registrations-list">
                        {eventRegistrations.map((registration, index) => (
                          <div key={registration.id} className="registration-card">
                            <div className="registration-card-header">
                              <div className="registration-number">#{index + 1}</div>
                              <div className="registration-user-info">
                                <div className="registration-user-name">
                                  <span className="user-icon"><User size={20} strokeWidth={1.8} /></span>
                                  <div className="user-name-content">
                                    <strong>
                                      {(() => {
                                        const profile = userProfiles[registration.userId];
                                        if (profile?.fullName) return profile.fullName;
                                        const name = registration.userName;
                                        if (name && !name.includes('@')) return name;
                                        return name || 'No name provided';
                                      })()}
                                    </strong>
                                    <span className="user-email-subtitle">{registration.userEmail || 'No email'}</span>
                                  </div>
                                </div>
                                <div className="registration-date-row">
                                  <Clock size={14} strokeWidth={1.8} />
                                  <span>
                                    {(() => {
                                      try {
                                        let dateValue = registration.createdAt;
                                        if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                                          dateValue = dateValue.toDate();
                                        } else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                                          dateValue = new Date(dateValue.seconds * 1000);
                                        } else if (dateValue) {
                                          dateValue = new Date(dateValue);
                                        }
                                        if (!dateValue || isNaN(dateValue.getTime())) return 'Date not available';
                                        return 'Registered on ' + dateValue.toLocaleString('en-US', {
                                          month: 'short', day: 'numeric', year: 'numeric',
                                          hour: '2-digit', minute: '2-digit'
                                        });
                                      } catch (e) {
                                        return 'Date not available';
                                      }
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {selectedEvent.registrationFields && selectedEvent.registrationFields.length > 0 && (
                              <div className="registration-responses">
                                <div className="responses-header">
                                  <span className="responses-title">
                                    <FileText size={16} strokeWidth={1.8} />
                                    Registration Details
                                  </span>
                                </div>
                                <div className="responses-grid">
                                  {selectedEvent.registrationFields.map((field) => {
                                    const response = registration.responses && registration.responses[field.id];
                                    return (
                                      <div key={field.id} className="response-item">
                                        <span className="response-label">
                                          {field.label}
                                          {field.required && <span className="required-indicator">*</span>}
                                        </span>
                                        <span className="response-value">
                                          {response ? String(response) : <em className="response-empty">Not answered</em>}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer registrations-modal-footer">
                  <button
                    className="btn btn-primary"
                    onClick={handleEventPrint}
                    disabled={eventRegistrations.length === 0}
                  >
                    <Printer size={16} strokeWidth={1.8} />
                    Export to PDF
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowRegistrationsModal(false)}
                  >
                    Close
                  </button>
                </div>
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
                  Are you sure you want to delete "{selectedEvent?.title}"? 
                  This will also delete all registrations for this event. This action cannot be undone.
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
          {/* Hidden Event Print Component */}
          <EventPrintView
            ref={eventPrintRef}
            event={selectedEvent}
            registrations={eventRegistrations}
            userProfiles={userProfiles}
          />
        </div>
      </div>
    </div>
  );
};

export default ManageEvents;

