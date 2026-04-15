import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToChanges, addItem } from '../services/dataService';
import { useToast } from '../contexts/ToastContext';
import PageLoader from '../components/PageLoader';
import './Events.css';
import './Dashboard.css';

const Events = () => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Subscribe to real-time events updates
    const unsubscribeEvents = subscribeToChanges('events', (data) => {
      setEvents(data);
      setIsLoading(false);
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

  const getEventStatus = (event) => {
    const eventDate = new Date(event.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate < today) return 'past';
    if (eventDate.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const isRegistered = (eventId) => {
    return registrations.some(
      reg => reg.eventId === eventId && reg.userId === currentUser?.uid
    );
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      if (statusFilter === 'all') return true;
      const status = getEventStatus(event);
      return status === statusFilter;
    });
  };

  const handleOpenRegistration = (event) => {
    if (isRegistered(event.id)) {
      showToast('You have already registered for this event', 'info');
      return;
    }

    setSelectedEvent(event);
    // Initialize form with empty values for each field
    const initialForm = {};
    if (event.registrationFields) {
      event.registrationFields.forEach(field => {
        initialForm[field.id] = '';
      });
    }
    setRegistrationForm(initialForm);
    setShowRegistrationModal(true);
  };

  const handleFormChange = (fieldId, value) => {
    setRegistrationForm(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateRegistration = () => {
    if (!selectedEvent || !selectedEvent.registrationFields) return true;

    for (const field of selectedEvent.registrationFields) {
      if (field.required && !registrationForm[field.id]?.trim()) {
        showToast(`Please fill in "${field.label}"`, 'error');
        return false;
      }
    }
    return true;
  };

  const handleSubmitRegistration = async () => {
    if (!validateRegistration()) return;

    setIsSubmitting(true);
    try {
      await addItem('eventRegistrations', {
        eventId: selectedEvent.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.fullName || userProfile?.displayName || currentUser.displayName || currentUser.email,
        responses: registrationForm,
        createdAt: new Date().toISOString()
      });

      showToast('Successfully registered for the event!', 'success');
      setShowRegistrationModal(false);
      setSelectedEvent(null);
      setRegistrationForm({});
    } catch (error) {
      console.error('Error submitting registration:', error);
      showToast('Failed to register. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormField = (field) => {
    const value = registrationForm[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className={`form-textarea ${field.required && !value.trim() ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => handleFormChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows="4"
            required={field.required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className={`form-input ${field.required && !value.trim() ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => handleFormChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
      case 'dropdown':
        return (
          <select
            className={`form-select ${field.required && !value ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => handleFormChange(field.id, e.target.value)}
            required={field.required}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      default: // text
        return (
          <input
            type="text"
            className={`form-input ${field.required && !value.trim() ? 'input-error' : ''}`}
            value={value}
            onChange={(e) => handleFormChange(field.id, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
          />
        );
    }
  };

  const filteredEvents = getFilteredEvents();

  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading events...">
      <div className="dashboard-wrapper">
        <div className="dashboard">
          <div className="dash-content-header">
            <div className="dash-header-left">
              <h1 className="dash-title">Events & Programs</h1>
              <p className="dash-subtitle">View and join upcoming community events in Barangay Mabayuan.</p>
            </div>
          </div>

        {/* Filters */}
        <div className="filters-section">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="past">Past</option>
          </select>
        </div>

        {/* Events Grid */}
        <div className="events-container">
          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Calendar size={48} strokeWidth={1.5} /></div>
              <h3>No Events Available</h3>
              <p>Check back later for upcoming events and programs.</p>
            </div>
          ) : (
            <div className="events-grid">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event);
                const registered = isRegistered(event.id);
                const registrationCount = registrations.filter(r => r.eventId === event.id).length;

                return (
                  <div key={event.id} className="event-card">
                    <div className="event-header">
                      <h3 className="event-title">{event.title}</h3>
                      <span className={`status-badge status-${status}`}>
                        {status === 'upcoming' ? 'Upcoming' : status === 'today' ? 'Today' : 'Past'}
                      </span>
                    </div>

                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}

                    <div className="event-details">
                      <div className="event-detail-item">
                        <span className="detail-icon"><Calendar size={18} strokeWidth={1.8} /></span>
                        <span className="detail-text">
                          {new Date(event.eventDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {event.eventTime && (
                        <div className="event-detail-item">
                          <span className="detail-icon"><Clock size={18} strokeWidth={1.8} /></span>
                          <span className="detail-text">{event.eventTime}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="event-detail-item">
                          <span className="detail-icon"><MapPin size={18} strokeWidth={1.8} /></span>
                          <span className="detail-text">{event.location}</span>
                        </div>
                      )}
                      <div className="event-detail-item">
                        <span className="detail-icon"><Users size={18} strokeWidth={1.8} /></span>
                        <span className="detail-text">{registrationCount} registered</span>
                      </div>
                    </div>

                    {registered && (
                      <div className="registered-badge">
                        ✅ You are registered for this event
                      </div>
                    )}

                    {status !== 'past' && !registered && (
                      <button
                        className="btn btn-primary btn-register"
                        onClick={() => handleOpenRegistration(event)}
                      >
                        Register Now
                      </button>
                    )}

                    {status === 'past' && (
                      <div className="event-closed">
                        This event has ended
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Registration Modal */}
        {showRegistrationModal && selectedEvent && (
          <div className="modal-overlay" onClick={() => setShowRegistrationModal(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Register: {selectedEvent.title}</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowRegistrationModal(false)}
                >
                  ✖️
                </button>
              </div>
              <div className="modal-body">
                {selectedEvent.description && (
                  <div className="event-info-box">
                    <p>{selectedEvent.description}</p>
                    <div className="event-info-details">
                      <strong>Date:</strong> {new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {selectedEvent.eventTime && (
                        <> | <strong>Time:</strong> {selectedEvent.eventTime}</>
                      )}
                      {selectedEvent.location && (
                        <> | <strong>Location:</strong> {selectedEvent.location}</>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.registrationFields && selectedEvent.registrationFields.length > 0 ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitRegistration(); }}>
                    <div className="registration-form">
                      {selectedEvent.registrationFields.map((field) => (
                        <div key={field.id} className="form-group">
                          <label className="form-label">
                            {field.label}
                            {field.required && <span className="required-asterisk">*</span>}
                          </label>
                          {renderFormField(field)}
                        </div>
                      ))}
                    </div>
                  </form>
                ) : (
                  <div className="no-fields-message">
                    <p>No registration form required. Click Register to confirm your participation.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRegistrationModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </PageLoader>
  );
};

export default Events;



