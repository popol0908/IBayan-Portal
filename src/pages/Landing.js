import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, User, Mic, Megaphone } from 'lucide-react';
import { subscribeToChanges } from '../services/dataService';
import './Landing.css';
import './Announcements.css';

const iconProps = { size: 28, strokeWidth: 1.5 };

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

const Landing = () => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Fetch only the latest 3 announcements for the landing page or just limit in UI
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      setAnnouncements(data.slice(0, 3)); // showing latest 3
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="ibayan-landing">
      {/* ===== TOP NAVIGATION BAR ===== */}
      <nav className="ibayan-navbar">
        <div className="ibayan-navbar-inner">
          <Link to="/" className="ibayan-brand">
            <img
              src="/logo.png"
              alt="Barangay Mabayuan Seal"
              className="ibayan-brand-logo"
            />
            <span className="ibayan-brand-name">iBayan Portal</span>
          </Link>

          <ul className="ibayan-nav-links">
            <li><a href="#hero">Home</a></li>
            <li><a href="#announcements">Announcements</a></li>
            <li><a href="#features">Features</a></li>
          </ul>

          <div className="ibayan-nav-actions">
            <Link to="/admin/login" className="ibayan-nav-admin">Admin Portal</Link>
            <Link to="/login" className="ibayan-nav-login">Login</Link>
            <Link to="/signup" className="ibayan-nav-signup">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="ibayan-hero" id="hero">
        <div className="ibayan-hero-inner">
          <span className="ibayan-hero-badge">Barangay Mabayuan Official Portal</span>
          <h1 className="ibayan-hero-headline">
            Empowering our Community through{' '}
            <span className="ibayan-hero-highlight">Digital Innovation</span>
          </h1>
          <p className="ibayan-hero-desc">
            iBayan Portal is your all-in-one digital companion for barangay services.
            Manage your household, stay updated with news, and report emergencies with ease.
          </p>
          <div className="ibayan-hero-cta">
            <Link to="/login" className="ibayan-btn-primary">Resident Login</Link>
            <Link to="/signup" className="ibayan-btn-outline">Sign Up Now</Link>
          </div>
          <div className="ibayan-hero-stats">
            <div className="ibayan-stat">
              <span className="ibayan-stat-number">5,000+</span>
              <span className="ibayan-stat-label">Registered Residents</span>
            </div>
            <div className="ibayan-stat-divider" />
            <div className="ibayan-stat">
              <span className="ibayan-stat-number">1,200+</span>
              <span className="ibayan-stat-label">Households Served</span>
            </div>
            <div className="ibayan-stat-divider" />
            <div className="ibayan-stat">
              <span className="ibayan-stat-number">24/7</span>
              <span className="ibayan-stat-label">Emergency Response</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ANNOUNCEMENTS SECTION ===== */}
      <section className="ibayan-announcements" id="announcements">
        <div className="ibayan-section-inner">
          <div className="ibayan-announcements-header">
            <h2 className="ibayan-section-title">Latest Announcements</h2>
            <Link to="/login" className="ibayan-view-more">
              View More Announcements
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="ibayan-announcements-container">
            {announcements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
                <h3>No Recent Announcements</h3>
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
        </div>
      </section>

      {/* ===== FEATURE ICONS SECTION ===== */}
      <section className="ibayan-features" id="features">
        <div className="ibayan-section-inner">
          <div className="ibayan-features-row">
            {/* Shield — Security */}
            <div className="ibayan-feature-icon-item">
              <div className="ibayan-feature-icon-circle">
                <Shield {...iconProps} />
              </div>
              <span className="ibayan-feature-icon-label">Security</span>
            </div>

            {/* Document — Documents */}
            <div className="ibayan-feature-icon-item">
              <div className="ibayan-feature-icon-circle">
                <FileText {...iconProps} />
              </div>
              <span className="ibayan-feature-icon-label">Documents</span>
            </div>

            {/* Person — Profile */}
            <div className="ibayan-feature-icon-item">
              <div className="ibayan-feature-icon-circle">
                <User {...iconProps} />
              </div>
              <span className="ibayan-feature-icon-label">Profile</span>
            </div>

            {/* Microphone — Feedback */}
            <div className="ibayan-feature-icon-item">
              <div className="ibayan-feature-icon-circle">
                <Mic {...iconProps} />
              </div>
              <span className="ibayan-feature-icon-label">Feedback</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="ibayan-footer">
        <div className="ibayan-footer-inner">
          <div className="ibayan-footer-col ibayan-footer-brand-col">
            <h3 className="ibayan-footer-brand">iBayan Portal</h3>
            <p className="ibayan-footer-brand-desc">
              Empowering the community of Barangay Mabayuan through digital innovation
              and efficient resident management.
            </p>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">Quick Links</h4>
            <ul className="ibayan-footer-list">
              <li><a href="#hero">Home</a></li>
              <li><a href="#announcements">Announcements</a></li>
              <li><a href="#features">Features</a></li>
              <li><Link to="/login">Resident Login</Link></li>
            </ul>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">Contact Us</h4>
            <ul className="ibayan-footer-list ibayan-footer-contact">
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Barangay Mabayuan, Philippines</span>
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>(+63) 912-345-6789</span>
              </li>
            </ul>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">System Status</h4>
            <div className="ibayan-status-indicator">
              <span className="ibayan-status-dot" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
        <div className="ibayan-footer-bottom">
          <p>&copy; 2024 iBayan Portal — Barangay Mabayuan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
