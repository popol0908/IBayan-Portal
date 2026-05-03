import React, { useState, useEffect } from 'react';
import { Megaphone, Leaf, HeartPulse, ShieldAlert, CalendarHeart, HandHelping, ArrowRight, X } from 'lucide-react';
import { getSharedData, subscribeToChanges } from '../services/dataService';
import PageLoader from '../components/PageLoader';
import './Announcements.css';
import './Dashboard.css';

const CATEGORIES = ['All', 'Environment', 'Health', 'Safety', 'Events', 'Services'];

const getCategoryConfig = (type) => {
  switch (type) {
    case 'Environment':
      return { badge: 'cat-environment', border: 'border-environment', color: '#16A34A', gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', icon: <Leaf size={36} strokeWidth={1.5} /> };
    case 'Health':
      return { badge: 'cat-health', border: 'border-health', color: '#2563EB', gradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', icon: <HeartPulse size={36} strokeWidth={1.5} /> };
    case 'Safety':
      return { badge: 'cat-safety', border: 'border-safety', color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', icon: <ShieldAlert size={36} strokeWidth={1.5} /> };
    case 'Events':
      return { badge: 'cat-events', border: 'border-events', color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)', icon: <CalendarHeart size={36} strokeWidth={1.5} /> };
    case 'Services':
      return { badge: 'cat-services', border: 'border-services', color: '#EA580C', gradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', icon: <HandHelping size={36} strokeWidth={1.5} /> };
    // Legacy fallbacks
    case 'Emergency':
    case 'Security':
      return { badge: 'cat-safety', border: 'border-safety', color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', icon: <ShieldAlert size={36} strokeWidth={1.5} /> };
    case 'Infrastructure':
      return { badge: 'cat-services', border: 'border-services', color: '#EA580C', gradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', icon: <HandHelping size={36} strokeWidth={1.5} /> };
    case 'General':
    default:
      return { badge: 'cat-environment', border: 'border-environment', color: '#16A34A', gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', icon: <Leaf size={36} strokeWidth={1.5} /> };
  }
};

// Get the active color for category tabs
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

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [detailAnnouncement, setDetailAnnouncement] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      setAnnouncements(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getFilteredAnnouncements = () => {
    let filtered = [...announcements];
    if (activeCategory !== 'All') {
      filtered = filtered.filter(a => a.type === activeCategory);
    }
    // Sort: pinned first, then by datePosted descending
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const dateA = new Date(a.datePosted || a.createdAt || 0);
      const dateB = new Date(b.datePosted || b.createdAt || 0);
      return dateB - dateA;
    });
  };

  // Check if announcement was updated after being posted
  const hasBeenUpdated = (announcement) => {
    if (!announcement.updatedAt || !announcement.datePosted) return false;
    const posted = new Date(announcement.datePosted).getTime();
    const updated = new Date(announcement.updatedAt).getTime();
    // Consider updated if more than 60 seconds difference
    return Math.abs(updated - posted) > 60000;
  };

  const formatTimestamp = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

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

          {/* Category Filter Tabs — color-coded */}
          <div className="category-tabs">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              const tabColor = getCategoryTabColor(cat);
              return (
                <button
                  key={cat}
                  className={`category-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
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

          {/* Announcements List */}
          <div className="announcements-container">
            {getFilteredAnnouncements().length === 0 ? (
              <div className="ann-empty-state">
                <div className="ann-empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
                <h3>{announcements.length === 0 ? 'No Announcements Yet' : 'No Announcements in This Category'}</h3>
                <p>{announcements.length === 0 ? 'Check back later for updates from the barangay.' : 'Try selecting a different category above.'}</p>
              </div>
            ) : (
              <div className="announcements-card-grid">
                {getFilteredAnnouncements().map((announcement) => {
                  const catConfig = getCategoryConfig(announcement.type);
                  return (
                    <div key={announcement.id} className={`ann-card ${announcement.pinned ? 'border-pinned' : catConfig.border}`}>
                      {/* Banner Image */}
                      <div className="ann-card-banner">
                        {announcement.imageUrl ? (
                          <img src={announcement.imageUrl} alt="" className="ann-banner-img" />
                        ) : (
                          <div className="ann-banner-placeholder" style={{ background: catConfig.gradient }}>
                            <div className="ann-placeholder-icon">{catConfig.icon}</div>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="ann-card-body">
                        {/* Top row: Category Badge (left) + Pinned Badge (right) */}
                        <div className="ann-card-top-row">
                          <span className={`ann-cat-badge ${catConfig.badge}`}>
                            {announcement.type || 'General'}
                          </span>
                          {announcement.pinned && (
                            <span className="ann-pinned-badge">📌 Pinned by Admin</span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="ann-card-title">{announcement.title}</h3>

                        {/* Description — always clamped to 3 lines */}
                        <p className="ann-card-excerpt">
                          {announcement.description}
                        </p>

                        {/* Read Full Announcement → opens modal */}
                        <button
                          className="ann-read-more"
                          onClick={() => setDetailAnnouncement(announcement)}
                        >
                          Read Full Announcement <ArrowRight size={14} strokeWidth={2.5} />
                        </button>

                        {/* Timestamps */}
                        <div className="ann-card-timestamps">
                          <div className="ann-timestamp">
                            <span className="ann-ts-label">When:</span>
                            <span className="ann-ts-value">
                              {new Date(announcement.whenDate || announcement.date).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric'
                              })}
                              {announcement.whenTime && (
                                <span> at {
                                  new Date(`2000-01-01T${announcement.whenTime}`).toLocaleTimeString('en-US', {
                                    hour: 'numeric', minute: '2-digit', hour12: true
                                  })
                                }</span>
                              )}
                            </span>
                          </div>
                          {announcement.datePosted && (
                            <div className="ann-timestamp">
                              <span className="ann-ts-label">Posted:</span>
                              <span className="ann-ts-value">
                                {formatTimestamp(announcement.datePosted)}
                              </span>
                            </div>
                          )}
                          {hasBeenUpdated(announcement) && (
                            <div className="ann-timestamp">
                              <span className="ann-ts-label">Updated:</span>
                              <span className="ann-ts-value">
                                {formatTimestamp(announcement.updatedAt)}
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

      {/* Detail Modal */}
      {detailAnnouncement && (() => {
        const catConfig = getCategoryConfig(detailAnnouncement.type);
        return (
          <div className="ann-detail-overlay" onClick={() => setDetailAnnouncement(null)}>
            <div className="ann-detail-modal" onClick={e => e.stopPropagation()}>
              <button className="ann-detail-close" onClick={() => setDetailAnnouncement(null)} aria-label="Close">
                <X size={20} strokeWidth={2} />
              </button>

              {/* Banner */}
              {detailAnnouncement.imageUrl ? (
                <div className="ann-detail-banner">
                  <img src={detailAnnouncement.imageUrl} alt="" />
                </div>
              ) : (
                <div className="ann-detail-banner ann-detail-banner-placeholder" style={{ background: catConfig.gradient }}>
                  <div className="ann-placeholder-icon">{catConfig.icon}</div>
                </div>
              )}

              <div className="ann-detail-body">
                <div className="ann-card-top-row">
                  <span className={`ann-cat-badge ${catConfig.badge}`}>
                    {detailAnnouncement.type || 'General'}
                  </span>
                  {detailAnnouncement.pinned && (
                    <span className="ann-pinned-badge">📌 Pinned by Admin</span>
                  )}
                </div>

                <h2 className="ann-detail-title">{detailAnnouncement.title}</h2>

                <div className="ann-detail-timestamps">
                  <span>When: {new Date(detailAnnouncement.whenDate || detailAnnouncement.date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                  {detailAnnouncement.whenTime && (
                    <span> at {new Date(`2000-01-01T${detailAnnouncement.whenTime}`).toLocaleTimeString('en-US', {
                      hour: 'numeric', minute: '2-digit', hour12: true
                    })}</span>
                  )}</span>
                  {detailAnnouncement.datePosted && (
                    <span>Posted: {formatTimestamp(detailAnnouncement.datePosted)}</span>
                  )}
                  {hasBeenUpdated(detailAnnouncement) && (
                    <span>Updated: {formatTimestamp(detailAnnouncement.updatedAt)}</span>
                  )}
                </div>

                <div className="ann-detail-content">
                  {detailAnnouncement.description}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </PageLoader>
  );
};

export default Announcements;
