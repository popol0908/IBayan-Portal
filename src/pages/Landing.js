import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone, Leaf, HeartPulse, ShieldAlert, CalendarHeart, HandHelping, ArrowRight,
  Shield, Home, Bell, ClipboardList,
  ChevronDown, MapPin, Phone,
  Menu, X
} from '../components/Icons';
import { subscribeToChanges } from '../services/dataService';
import { TermsModal, PrivacyModal } from '../components/LegalModals';
import './Landing.css';
import './Announcements.css';

/* ---- Category config for announcements ---- */
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
    case 'Emergency': case 'Security':
      return { badge: 'cat-safety', border: 'border-safety', color: '#DC2626', gradient: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', icon: <ShieldAlert size={36} strokeWidth={1.5} /> };
    case 'Infrastructure':
      return { badge: 'cat-services', border: 'border-services', color: '#EA580C', gradient: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)', icon: <HandHelping size={36} strokeWidth={1.5} /> };
    default:
      return { badge: 'cat-environment', border: 'border-environment', color: '#16A34A', gradient: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', icon: <Leaf size={36} strokeWidth={1.5} /> };
  }
};

/* ---- FAQ Data ---- */
const faqData = [
  { q: 'How do I register as a resident?', a: 'Click the "Sign Up" button, fill in your personal information, upload a valid proof of residency, and submit your registration. The barangay administration will verify your account within 1-3 business days.' },
  { q: 'What documents are accepted as proof of residency?', a: 'We accept Barangay Certificate of Residency, government-issued IDs with home address (PhilSys ID, Voter\'s ID, Driver\'s License), lease or rental contracts, and land titles or tax declarations.' },
  { q: 'How long does verification take?', a: 'The verification process typically takes 1-3 business days. You will receive a notification once your account has been approved or if additional information is needed.' },
  { q: 'Is my personal data safe?', a: 'Yes. We comply with the Data Privacy Act of 2012 (RA 10173). Your data is encrypted, stored securely, and used exclusively for official barangay purposes. We never sell or share your data with third parties.' },
  { q: 'Who can I contact for support?', a: 'You can visit the Barangay Mabayuan Hall during office hours or call 602-3900. You can also use the feedback feature within the portal once your account is verified.' },
];

/* ---- Features Data ---- */
const features = [
  { icon: <Megaphone size={28} strokeWidth={1.5} />, title: 'Announcements', desc: 'Stay updated with official barangay announcements, advisories, and community news in real time.' },
  { icon: <ShieldAlert size={28} strokeWidth={1.5} />, title: 'Emergency Alerts', desc: 'Receive critical emergency alerts and safety advisories instantly when it matters most.' },
  { icon: <Home size={28} strokeWidth={1.5} />, title: 'Household Profiling', desc: 'Register and manage your household profile digitally for accurate community records.' },
  { icon: <CalendarHeart size={28} strokeWidth={1.5} />, title: 'Event Management', desc: 'Discover upcoming community events, programs, and activities. Register and participate online.' },
  { icon: <Shield size={28} strokeWidth={1.5} />, title: 'Verified Accounts', desc: 'Secure identity verification ensures only legitimate residents can access community services.' },
];

/* ---- Scroll animation hook ---- */
const useScrollAnimation = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

const AnimatedSection = ({ children, className = '', delay = 0 }) => {
  const [ref, isVisible] = useScrollAnimation();
  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'animate-visible' : 'animate-hidden'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

/* ================================================================
   LANDING PAGE COMPONENT
   ================================================================ */
const Landing = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToChanges('announcements', (data) => {
      const activeData = data.filter(a => !a.archived);
      const sorted = [...activeData].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const getDate = (item) => {
          if (item.datePosted) return new Date(item.datePosted).getTime();
          if (item.createdAt) {
            return item.createdAt.toDate ? item.createdAt.toDate().getTime() : new Date(item.createdAt).getTime();
          }
          return 0;
        };
        return getDate(b) - getDate(a);
      });
      setAnnouncements(sorted.slice(0, 3));
    });
    return () => unsubscribe();
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="ibayan-landing">
      {/* ===== NAVBAR ===== */}
      <nav className="ibayan-navbar">
        <div className="ibayan-navbar-inner">
          <Link to="/" className="ibayan-brand">
            <img src="/logo.png" alt="Barangay Mabayuan Seal" className="ibayan-brand-logo" />
            <span className="ibayan-brand-name">iBayan Portal</span>
          </Link>

          <ul className="ibayan-nav-links">
            <li><button onClick={() => scrollTo('hero')}>Home</button></li>
            <li><button onClick={() => scrollTo('announcements')}>Announcements</button></li>
            <li><button onClick={() => scrollTo('features')}>Features</button></li>
            <li><button onClick={() => scrollTo('about')}>About</button></li>
            <li><button onClick={() => scrollTo('faq')}>FAQ</button></li>
          </ul>

          <div className="ibayan-nav-actions">
            <Link to="/admin/login" className="ibayan-nav-admin">Admin Portal</Link>
            <Link to="/login" className="ibayan-nav-login">Login</Link>
            <Link to="/signup" className="ibayan-nav-signup">Sign Up</Link>
          </div>

          <button className="ibayan-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="ibayan-mobile-menu">
            <button onClick={() => scrollTo('hero')}>Home</button>
            <button onClick={() => scrollTo('announcements')}>Announcements</button>
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('about')}>About</button>
            <button onClick={() => scrollTo('faq')}>FAQ</button>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
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
        </div>
      </section>

      {/* ===== ANNOUNCEMENTS ===== */}
      <section className="ibayan-announcements" id="announcements">
        <div className="ibayan-section-inner">
          <AnimatedSection>
            <div className="ibayan-announcements-header">
              <h2 className="ibayan-section-title">Latest Announcements</h2>
              <Link to="/login" className="ibayan-view-more">
                View More Announcements
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </AnimatedSection>

          <div className="ibayan-announcements-container">
            {announcements.length === 0 ? (
              <div className="ann-empty-state">
                <div className="ann-empty-icon"><Megaphone size={48} strokeWidth={1.5} /></div>
                <h3>No Recent Announcements</h3>
                <p>Check back later for updates.</p>
              </div>
            ) : (
              <div className="announcements-card-grid">
                {announcements.map((announcement, index) => {
                  const catConfig = getCategoryConfig(announcement.type);
                  return (
                    <AnimatedSection key={announcement.id} delay={index * 100}>
                      <div className={`ann-card ${announcement.pinned ? 'border-pinned' : catConfig.border}`}>
                        <div className="ann-card-banner">
                          {announcement.imageUrl ? (
                            <img src={announcement.imageUrl} alt="" className="ann-banner-img" />
                          ) : (
                            <div className="ann-banner-placeholder" style={{ background: catConfig.gradient }}>
                              <div className="ann-placeholder-icon">{catConfig.icon}</div>
                            </div>
                          )}
                        </div>
                        <div className="ann-card-body">
                          <div className="ann-card-top-row">
                            <span className={`ann-cat-badge ${catConfig.badge}`}>
                              {announcement.type || 'General'}
                            </span>
                            {announcement.pinned && (
                              <span className="ann-pinned-badge">📌 Pinned by Admin</span>
                            )}
                          </div>
                          <h3 className="ann-card-title">{announcement.title}</h3>
                          <p className="ann-card-excerpt">{announcement.description}</p>
                          <Link to="/login" className="ann-read-more">
                            Login to Read More <ArrowRight size={14} strokeWidth={2.5} />
                          </Link>
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
                                  {new Date(announcement.datePosted).toLocaleDateString('en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AnimatedSection>
                  );
                })}
              </div>
            )}
            {announcements.length > 0 && (
              <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                <Link to="/login" className="ibayan-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.4rem' }}>
                  See All Announcements <ArrowRight size={18} strokeWidth={2} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="ibayan-features" id="features">
        <div className="ibayan-section-inner">
          <AnimatedSection>
            <div className="ibayan-features-header">
              <h2 className="ibayan-section-title">System Features</h2>
              <p className="ibayan-section-subtitle">Everything you need to stay connected with your barangay — all in one platform.</p>
            </div>
          </AnimatedSection>
          <div className="ibayan-features-grid">
            {features.map((f, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <div className="ibayan-feature-card">
                  <div className="ibayan-feature-card-icon">{f.icon}</div>
                  <h3 className="ibayan-feature-card-title">{f.title}</h3>
                  <p className="ibayan-feature-card-desc">{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="ibayan-about" id="about">
        <div className="ibayan-section-inner">
          <div className="ibayan-about-grid">
            <AnimatedSection className="ibayan-about-text">
              <h2 className="ibayan-section-title">About the System</h2>
              <p>
                The <strong>iBayan Portal</strong> is the official digital platform of Barangay Mabayuan,
                Olongapo City. It was designed to modernize the way the barangay communicates with
                and serves its residents.
              </p>
              <p>
                Through this system, residents can view official announcements, receive emergency
                alerts, register for events, manage their household profile, and provide feedback —
                all from the convenience of their device.
              </p>
              <p>
                Built with security and data privacy as core principles, the iBayan Portal ensures
                that all personal information is protected in compliance with the Data Privacy Act of
                2012 (RA 10173).
              </p>
            </AnimatedSection>
            <AnimatedSection className="ibayan-about-highlights" delay={150}>
              <div className="ibayan-highlight">
                <div className="ibayan-highlight-icon"><Shield size={24} strokeWidth={1.5} /></div>
                <div>
                  <strong>Secure & Compliant</strong>
                  <span>RA 10173 Data Privacy Act compliance</span>
                </div>
              </div>
              <div className="ibayan-highlight">
                <div className="ibayan-highlight-icon"><Bell size={24} strokeWidth={1.5} /></div>
                <div>
                  <strong>Real-Time Alerts</strong>
                  <span>Instant emergency notifications</span>
                </div>
              </div>
              <div className="ibayan-highlight">
                <div className="ibayan-highlight-icon"><ClipboardList size={24} strokeWidth={1.5} /></div>
                <div>
                  <strong>Digital Records</strong>
                  <span>Paperless household profiling</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ===== LOCATION ===== */}
      <section className="ibayan-location" id="location">
        <div className="ibayan-section-inner">
          <AnimatedSection>
            <div className="ibayan-features-header">
              <h2 className="ibayan-section-title">Our Location</h2>
              <p className="ibayan-section-subtitle">Visit us at the Barangay Mabayuan Hall, Olongapo City.</p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={100}>
            <div className="ibayan-location-grid">
              <div className="ibayan-map-container">
                <iframe
                  title="Barangay Mabayuan Location"
                  src="https://maps.google.com/maps?q=Barangay%20Mabayuan%20Hall,%20Olongapo%20City&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, borderRadius: '12px' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="ibayan-location-info">
                <div className="ibayan-location-item">
                  <MapPin size={20} strokeWidth={1.8} />
                  <div>
                    <strong>Address</strong>
                    <span>Barangay Mabayuan Hall, Olongapo City, Zambales, Philippines</span>
                  </div>
                </div>
                <div className="ibayan-location-item">
                  <Phone size={20} strokeWidth={1.8} />
                  <div>
                    <strong>Contact Number</strong>
                    <span>602-3900</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="ibayan-faq" id="faq">
        <div className="ibayan-section-inner">
          <AnimatedSection>
            <div className="ibayan-features-header">
              <h2 className="ibayan-section-title">Frequently Asked Questions</h2>
              <p className="ibayan-section-subtitle">Find answers to the most common questions about the iBayan Portal.</p>
            </div>
          </AnimatedSection>
          <div className="ibayan-faq-list">
            {faqData.map((item, i) => (
              <AnimatedSection key={i} delay={i * 60}>
                <div className={`ibayan-faq-item ${openFaq === i ? 'open' : ''}`}>
                  <button className="ibayan-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{item.q}</span>
                    <ChevronDown size={20} strokeWidth={2} className="ibayan-faq-chevron" />
                  </button>
                  <div className="ibayan-faq-answer">
                    <p>{item.a}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="ibayan-footer">
        <div className="ibayan-footer-inner">
          <div className="ibayan-footer-col ibayan-footer-brand-col">
            <div className="ibayan-footer-brand-row">
              <img src="/logo.png" alt="" className="ibayan-footer-logo" />
              <h3 className="ibayan-footer-brand">iBayan Portal</h3>
            </div>
            <p className="ibayan-footer-brand-desc">
              Empowering the community of Barangay Mabayuan through digital innovation
              and efficient resident management.
            </p>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">Quick Links</h4>
            <ul className="ibayan-footer-list">
              <li><button onClick={() => scrollTo('hero')}>Home</button></li>
              <li><button onClick={() => scrollTo('announcements')}>Announcements</button></li>
              <li><button onClick={() => scrollTo('features')}>Features</button></li>
              <li><button onClick={() => scrollTo('about')}>About</button></li>
              <li><button onClick={() => scrollTo('faq')}>FAQ</button></li>
            </ul>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">Legal</h4>
            <ul className="ibayan-footer-list">
              <li><button onClick={() => setShowTerms(true)}>Terms & Conditions</button></li>
              <li><button onClick={() => setShowPrivacy(true)}>Privacy Policy</button></li>
            </ul>
          </div>

          <div className="ibayan-footer-col">
            <h4 className="ibayan-footer-heading">Contact Us</h4>
            <ul className="ibayan-footer-list ibayan-footer-contact">
              <li>
                <MapPin size={14} strokeWidth={2} />
                <span>Barangay Mabayuan, Olongapo City</span>
              </li>
              <li>
                <Phone size={14} strokeWidth={2} />
                <span>602-3900</span>
              </li>
            </ul>
            <div className="ibayan-status-indicator">
              <span className="ibayan-status-dot" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
        <div className="ibayan-footer-bottom">
          <p>&copy; {new Date().getFullYear()} iBayan Portal — Barangay Mabayuan. All rights reserved.</p>
        </div>
      </footer>

      {/* Legal Modals */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
};

export default Landing;
