import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Siren, Calendar, User, ArrowRight, Home } from 'lucide-react';
import IconBox from '../components/IconBox';
import { getSharedData, subscribeToChanges } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
import './Dashboard.css';
import './Announcements.css';

const iconProps = { size: 24, strokeWidth: 1.8 };

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

const Dashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get first name for personalized greeting
  const fullName = userProfile?.fullName || currentUser?.displayName || 'Resident';
  const firstName = fullName.split(' ')[0];

  useEffect(() => {
    // Subscribe to real-time announcements updates
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      setAnnouncements(data.slice(0, 3));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading dashboard...">
      <div className="dashboard-wrapper">
        <div className="dashboard">
        <div className="dash-content-header">
          <div className="dash-header-left">
            <h1 className="dash-title">Magandang araw, {firstName}!</h1>
            <p className="dash-subtitle">Stay informed with the latest updates from Barangay Mabayuan.</p>
          </div>
        </div>

      <section className="announcements-section">
        <div className="quick-actions">
          <div className="section-header">
            <h2 className="section-title">Recent Announcements</h2>
            <Link to="/announcements" className="view-all-link">
              View All →
            </Link>
          </div>
        
        {announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
            <h3>No Announcements Yet</h3>
            <p>Check back later for updates.</p>
          </div>
        ) : (
          <div className="announcement-list">
            {announcements.map((announcement) => {
              const typeStyle = getTypeStyle(announcement.type);
              return (
                <div
                  key={announcement.id}
                  className="announcement-list-item"
                  style={{ borderLeftColor: typeStyle.accent }}
                >
                  {/* Header: type badges */}
                  <div className="item-header">
                    <div className="item-badges">
                      <span className={`type-badge ${typeStyle.badge}`}>
                        {announcement.type || 'General'}
                      </span>
                      {(announcement.type === 'Emergency' || announcement.type === 'Security') && (
                        <span className="type-badge type-important">Important</span>
                      )}
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
            })}
          </div>
        )}
        </div>
      </section>

      {}
      <section className="quick-actions-section">
        <div className="quick-actions">
          <h2 className="section-title">Quick Actions</h2>
          
          {/* Community Information */}
          <div className="action-group">
            <h3 className="action-group-title">
              <span className="group-icon"><Megaphone {...iconProps} /></span>
              Community Information
            </h3>
            <div className="action-buttons">
              <Link to="/announcements" className="action-card action-primary">
                <IconBox variant="blue" size="sm" className="action-card-icon"><Megaphone size={24} strokeWidth={1.8} /></IconBox>
                <div className="action-card-content">
                  <h4 className="action-card-title">Announcements</h4>
                  <p className="action-card-description">Browse all community announcements and updates</p>
                </div>
                <div className="action-card-arrow"><ArrowRight size={20} strokeWidth={2} /></div>
              </Link>
              
              <Link to="/emergency-alerts" className="action-card action-danger">
                <IconBox variant="red" size="sm" className="action-card-icon"><Siren size={24} strokeWidth={1.8} /></IconBox>
                <div className="action-card-content">
                  <h4 className="action-card-title">Emergency Alerts</h4>
                  <p className="action-card-description">View active emergency notifications and warnings</p>
                </div>
                <div className="action-card-arrow"><ArrowRight size={20} strokeWidth={2} /></div>
              </Link>
              
              <Link to="/events" className="action-card action-warning">
                <IconBox variant="amber" size="sm" className="action-card-icon"><Calendar size={24} strokeWidth={1.8} /></IconBox>
                <div className="action-card-content">
                  <h4 className="action-card-title">Community Events</h4>
                  <p className="action-card-description">View and join upcoming community events</p>
                </div>
                <div className="action-card-arrow"><ArrowRight size={20} strokeWidth={2} /></div>
              </Link>
            </div>
          </div>

          {/* Personal */}
          <div className="action-group">
            <h3 className="action-group-title">
              <span className="group-icon"><User {...iconProps} /></span>
              Personal
            </h3>
            <div className="action-buttons">
              <Link to="/profile" className="action-card action-info">
                <IconBox variant="blue" size="sm" className="action-card-icon"><User size={24} strokeWidth={1.8} /></IconBox>
                <div className="action-card-content">
                  <h4 className="action-card-title">My Profile</h4>
                  <p className="action-card-description">View and manage your account information</p>
                </div>
                <div className="action-card-arrow"><ArrowRight size={20} strokeWidth={2} /></div>
              </Link>

              <Link to="/household-profile" className="action-card action-success">
                <IconBox variant="green" size="sm" className="action-card-icon"><Home size={24} strokeWidth={1.8} /></IconBox>
                <div className="action-card-content">
                  <h4 className="action-card-title">Household Profile</h4>
                  <p className="action-card-description">Submit and view your household profile information</p>
                </div>
                <div className="action-card-arrow"><ArrowRight size={20} strokeWidth={2} /></div>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </div>
      </div>
    </PageLoader>
  );
};

export default Dashboard;
