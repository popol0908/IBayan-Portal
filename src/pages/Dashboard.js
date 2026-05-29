import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Siren, Calendar, User, ArrowRight, Home, Leaf, HeartPulse, ShieldAlert, CalendarHeart, HandHelping } from '../components/Icons';
import IconBox from '../components/IconBox';
import { getSharedData, subscribeToChanges } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import PageLoader from '../components/PageLoader';
import './Dashboard.css';
import './Announcements.css';

const iconProps = { size: 24, strokeWidth: 1.8 };

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
      const sorted = [...data].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const dateA = new Date(a.datePosted || a.createdAt || 0);
        const dateB = new Date(b.datePosted || b.createdAt || 0);
        return dateB - dateA;
      });
      setAnnouncements(sorted.slice(0, 3));
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

      <div className="dash-two-col">
        <div className="dash-main-col">
          <section className="announcements-section">
            <div className="quick-actions">
          <div className="section-header">
            <h2 className="section-title">Recent Announcements</h2>
            <Link to="/announcements" className="view-all-link">
              View All →
            </Link>
          </div>
        
        {announcements.length === 0 ? (
          <div className="ann-empty-state">
            <div className="ann-empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
            <h3>No Announcements Yet</h3>
            <p>Check back later for updates.</p>
          </div>
        ) : (
          <div className="announcements-card-grid">
            {announcements.map((announcement) => {
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
                    {/* Top row */}
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

                    {/* Description */}
                    <p className="ann-card-excerpt">
                      {announcement.description}
                    </p>

                    {/* Read Full Announcement → link to announcements page */}
                    <Link to="/announcements" className="ann-read-more">
                      Read Full Announcement <ArrowRight size={14} strokeWidth={2.5} />
                    </Link>

                    {/* Timestamps */}
                    <div className="ann-card-timestamps">
                      <div className="ann-timestamp">
                        <span className="ann-ts-label">When:</span>
                        <span className="ann-ts-value">
                          {new Date(announcement.whenDate || announcement.date).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                          {announcement.whenDateEnd && (
                            <span> to {new Date(announcement.whenDateEnd).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}</span>
                          )}
                        </span>
                      </div>
                      {announcement.whenTime && (
                        <div className="ann-timestamp">
                          <span className="ann-ts-label">Time:</span>
                          <span className="ann-ts-value">
                            {new Date(`2000-01-01T${announcement.whenTime}`).toLocaleTimeString('en-US', {
                              hour: 'numeric', minute: '2-digit', hour12: true
                            })}
                            {announcement.whenTimeEnd && (
                              <span> to {new Date(`2000-01-01T${announcement.whenTimeEnd}`).toLocaleTimeString('en-US', {
                                hour: 'numeric', minute: '2-digit', hour12: true
                              })}</span>
                            )}
                          </span>
                        </div>
                      )}
                      {announcement.datePosted && (
                        <div className="ann-timestamp">
                          <span className="ann-ts-label">Posted:</span>
                          <span className="ann-ts-value">
                            {new Date(announcement.datePosted).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
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
        
        {announcements.length > 0 && (
          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <Link to="/announcements" className="ibayan-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.4rem', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', color: '#374151', fontWeight: 600, textDecoration: 'none' }}>
              View All Announcements <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>
        )}
        </div>
      </section>
    </div>

      <div className="dash-sidebar-col">
        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <h2 className="sidebar-card-title">Quick Actions</h2>
          </div>
          <div className="sidebar-quick-actions">
            <Link to="/announcements" className="sidebar-qa-btn">
              <div className="qa-icon-wrap qa-blue"><Megaphone size={22} strokeWidth={2} /></div>
              <span className="qa-label">Announcements</span>
            </Link>
            <Link to="/events" className="sidebar-qa-btn">
              <div className="qa-icon-wrap qa-purple"><Calendar size={22} strokeWidth={2} /></div>
              <span className="qa-label">Events & Programs</span>
            </Link>
            <Link to="/profile" className="sidebar-qa-btn">
              <div className="qa-icon-wrap qa-amber"><User size={22} strokeWidth={2} /></div>
              <span className="qa-label">My Profile</span>
            </Link>
            <Link to="/household-profile" className="sidebar-qa-btn">
              <div className="qa-icon-wrap qa-green"><Home size={22} strokeWidth={2} /></div>
              <span className="qa-label">Household Profiling</span>
            </Link>
          </div>
        </div>
      </div>
  </div>
</div>
</div>
</PageLoader>
  );
};

export default Dashboard;
