import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { getSharedData, subscribeToChanges } from '../services/dataService';
import PageLoader from '../components/PageLoader';
import './Announcements.css';
import './Dashboard.css';

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

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      setAnnouncements(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading announcements...">
      <div className="dashboard-wrapper">
        <div className="dashboard">
          {/* Header */}
          <div className="dash-content-header">
            <div className="dash-header-left">
              <h1 className="dash-title">Barangay Announcements</h1>
              <p className="dash-subtitle">Stay informed with the latest updates from Barangay Mabayuan.</p>
            </div>
          </div>

        {/* Announcements List */}
        <div className="announcements-container">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
              <h3>No Announcements Yet</h3>
              <p>Check back later for updates from the barangay.</p>
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
        </div>
      </div>
    </PageLoader>
  );
};

export default Announcements;
