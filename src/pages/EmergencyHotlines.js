import React, { useState } from 'react';
import {
  Phone,
  Siren,
  Building2,
  Shield,
  Anchor,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Megaphone,
  HeartPulse,
  ShieldAlert,
  PhoneCall,
  Landmark,
  LifeBuoy,
  X,
} from '../components/Icons';
import './EmergencyHotlines.css';

const EmergencyHotlines = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState({ name: '', number: '' });

  const handleContactClick = (e, name, number) => {
    e.preventDefault();
    setSelectedContact({ name, number });
    setShowConfirmDialog(true);
  };

  const handleConfirmCall = () => {
    window.location.href = `tel:${selectedContact.number.replace(/-/g, '')}`;
    setShowConfirmDialog(false);
  };

  const handleCancelCall = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="hotlines-wrapper">
      <div className="hotlines-container">
        {/* Page Header */}
        <div className="hotlines-page-header">
          <div className="hotlines-header-icon">
            <Siren size={32} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="hotlines-page-title">Emergency Hotlines</h1>
            <p className="hotlines-page-subtitle">
              Important contact numbers for emergencies and barangay services. Save these numbers — they could save a life.
            </p>
          </div>
        </div>

        <div className="hotlines-layout">
          {/* ==================== LEFT COLUMN ==================== */}
          <div className="hotlines-left-col">

            {/* Barangay Mabayuan Hotline — Hero Card */}
            <div className="hotline-hero-card">
              <div className="hero-card-glow"></div>
              <div className="hero-card-content">
                <div className="hero-card-badge">
                  <Landmark size={16} strokeWidth={2} />
                  Barangay Mabayuan
                </div>
                <h2 className="hero-card-title">Barangay Mabayuan Hotline</h2>
                <p className="hero-card-desc">For immediate barangay assistance and local emergencies</p>
                <a 
                  href="tel:602-3900" 
                  className="hero-phone-number" 
                  id="mabayuan-hotline"
                  onClick={(e) => handleContactClick(e, 'Barangay Mabayuan Hotline', '602-3900')}
                >
                  <PhoneCall size={28} strokeWidth={2} className="hero-phone-icon" />
                  <span>602-3900</span>
                </a>
              </div>
            </div>

            {/* Olongapo City Emergency Hotlines */}
            <div className="hotline-section-card">
              <div className="section-card-header">
                <div className="section-card-icon olongapo-icon">
                  <Building2 size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="section-card-title">Olongapo City Emergency Hotlines</h3>
                  <p className="section-card-subtitle">City-level emergency response units</p>
                </div>
              </div>

              {/* DRRMO */}
              <div className="hotline-group">
                <div className="hotline-group-header">
                  <Flame size={18} strokeWidth={2} className="group-header-icon fire-icon" />
                  <h4 className="hotline-group-title">
                    Disaster Risk Reduction and Management Office
                    <span className="hotline-group-tag">at Olongapo Fire Search and Rescue</span>
                  </h4>
                </div>
                <div className="hotline-entries">
                  <a 
                    href="tel:09173065966" 
                    className="hotline-entry" 
                    id="drrmo-globe"
                    onClick={(e) => handleContactClick(e, 'DRRMO (Globe)', '0917-306-5966')}
                  >
                    <span className="entry-label">Globe</span>
                    <span className="entry-number">0917-306-5966</span>
                  </a>
                  <a 
                    href="tel:09985937446" 
                    className="hotline-entry" 
                    id="drrmo-smart"
                    onClick={(e) => handleContactClick(e, 'DRRMO (Smart)', '0998-593-7446')}
                  >
                    <span className="entry-label">Smart</span>
                    <span className="entry-number">0998-593-7446</span>
                  </a>
                  <a 
                    href="tel:2236876" 
                    className="hotline-entry" 
                    id="drrmo-landline"
                    onClick={(e) => handleContactClick(e, 'DRRMO (Landline)', '223-6876')}
                  >
                    <span className="entry-label">Landline</span>
                    <span className="entry-number">223-6876</span>
                  </a>
                </div>
              </div>

              {/* Police Stations */}
              <div className="hotline-group">
                <div className="hotline-group-header">
                  <Shield size={18} strokeWidth={2} className="group-header-icon police-icon" />
                  <h4 className="hotline-group-title">Olongapo City Police Stations</h4>
                </div>
                <div className="hotline-entries">
                  <a 
                    href="tel:2225731" 
                    className="hotline-entry" 
                    id="police-ocps"
                    onClick={(e) => handleContactClick(e, 'OCPS', '222-5731')}
                  >
                    <span className="entry-label">OCPS</span>
                    <span className="entry-number">222-5731</span>
                  </a>
                  <div className="hotline-entry-multi" id="police-station1">
                    <span className="entry-label">Station 1 <span className="station-area">(Triangle)</span></span>
                    <div className="entry-numbers">
                      <a 
                        href="tel:2225101" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 1 (Triangle)', '222-5101')}
                      >222-5101</a>
                      <span className="number-divider">|</span>
                      <a 
                        href="tel:09185763537" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 1 (Triangle)', '0918-576-3537')}
                      >0918-576-3537</a>
                    </div>
                  </div>
                  <div className="hotline-entry-multi" id="police-station2">
                    <span className="entry-label">Station 2 <span className="station-area">(New Kababae)</span></span>
                    <div className="entry-numbers">
                      <a 
                        href="tel:2221020" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 2 (New Kababae)', '222-1020')}
                      >222-1020</a>
                      <span className="number-divider">|</span>
                      <a 
                        href="tel:09985985549" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 2 (New Kababae)', '0998-598-5549')}
                      >0998-598-5549</a>
                    </div>
                  </div>
                  <div className="hotline-entry-multi" id="police-station3">
                    <span className="entry-label">Station 3 <span className="station-area">(Magsaysay)</span></span>
                    <div className="entry-numbers">
                      <a 
                        href="tel:2220964" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 3 (Magsaysay)', '222-0964')}
                      >222-0964</a>
                      <span className="number-divider">|</span>
                      <a 
                        href="tel:09985985561" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 3 (Magsaysay)', '0998-598-5561')}
                      >0998-598-5561</a>
                    </div>
                  </div>
                  <a 
                    href="tel:09985985563" 
                    className="hotline-entry" 
                    id="police-station4"
                    onClick={(e) => handleContactClick(e, 'Police Station 4 (New Cabalan)', '0998-598-5563')}
                  >
                    <span className="entry-label">Station 4 <span className="station-area">(New Cabalan)</span></span>
                    <span className="entry-number">0998-598-5563</span>
                  </a>
                  <div className="hotline-entry-multi" id="police-station5">
                    <span className="entry-label">Station 5 <span className="station-area">(Sta. Rita)</span></span>
                    <div className="entry-numbers">
                      <a 
                        href="tel:2220402" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 5 (Sta. Rita)', '222-0402')}
                      >222-0402</a>
                      <span className="number-divider">|</span>
                      <a 
                        href="tel:09985985567" 
                        className="entry-number"
                        onClick={(e) => handleContactClick(e, 'Police Station 5 (Sta. Rita)', '0998-598-5567')}
                      >0998-598-5567</a>
                    </div>
                  </div>
                  <a 
                    href="tel:09985985569" 
                    className="hotline-entry" 
                    id="police-station6"
                    onClick={(e) => handleContactClick(e, 'Police Station 6 (Barretto)', '0998-598-5569')}
                  >
                    <span className="entry-label">Station 6 <span className="station-area">(Barretto)</span></span>
                    <span className="entry-number">0998-598-5569</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Other Contacts */}
            <div className="hotline-section-card">
              <div className="section-card-header">
                <div className="section-card-icon other-icon">
                  <Phone size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="section-card-title">Other Contacts</h3>
                  <p className="section-card-subtitle">Specialized law enforcement & maritime units</p>
                </div>
              </div>

              <div className="hotline-entries">
                <div className="hotline-entry-multi" id="contact-saf">
                  <span className="entry-label">
                    <ShieldAlert size={15} strokeWidth={2} className="entry-icon" />
                    SAF / TOC
                  </span>
                  <div className="entry-numbers">
                    <a 
                      href="tel:09075549053" 
                      className="entry-number"
                      onClick={(e) => handleContactClick(e, 'SAF / TOC', '0907-554-9053')}
                    >0907-554-9053</a>
                    <span className="number-divider">|</span>
                    <a 
                      href="tel:09192450666" 
                      className="entry-number"
                      onClick={(e) => handleContactClick(e, 'SAF / TOC', '0919-245-0666')}
                    >0919-245-0666</a>
                  </div>
                </div>
                <a 
                  href="tel:6024440" 
                  className="hotline-entry" 
                  id="contact-soco"
                  onClick={(e) => handleContactClick(e, 'SOCO', '602-4440')}
                >
                  <span className="entry-label">
                    <Shield size={15} strokeWidth={2} className="entry-icon" />
                    SOCO
                  </span>
                  <span className="entry-number">602-4440</span>
                </a>
                <a 
                  href="tel:09995240246" 
                  className="hotline-entry" 
                  id="contact-pnp-maritime"
                  onClick={(e) => handleContactClick(e, 'PNP Maritime Group', '0999-524-0246')}
                >
                  <span className="entry-label">
                    <Anchor size={15} strokeWidth={2} className="entry-icon" />
                    PNP Maritime Group
                  </span>
                  <span className="entry-number">0999-524-0246</span>
                </a>
                <a 
                  href="tel:09985858197" 
                  className="hotline-entry" 
                  id="contact-coast-guard"
                  onClick={(e) => handleContactClick(e, 'Philippine Coast Guard', '0998-585-8197')}
                >
                  <span className="entry-label">
                    <LifeBuoy size={15} strokeWidth={2} className="entry-icon" />
                    Philippine Coast Guard
                  </span>
                  <span className="entry-number">0998-585-8197</span>
                </a>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN ==================== */}
          <div className="hotlines-right-col">

            {/* Emergency Tips */}
            <div className="tips-card">
              <div className="tips-card-header">
                <div className="tips-icon-wrap">
                  <AlertTriangle size={22} strokeWidth={2} />
                </div>
                <h3 className="tips-card-title">Emergency Tips</h3>
              </div>

              <div className="tips-list">
                <div className="tip-item">
                  <div className="tip-number">1</div>
                  <div className="tip-content">
                    <h4>Stay Calm</h4>
                    <p>Take a deep breath. Panicking can make situations worse. Think clearly before acting.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">2</div>
                  <div className="tip-content">
                    <h4>Call for Help Immediately</h4>
                    <p>Dial the appropriate emergency number. Provide your exact location and a brief description of the situation.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">3</div>
                  <div className="tip-content">
                    <h4>Know Your Location</h4>
                    <p>Be aware of your street name, nearest landmark, and purok. This helps responders find you faster.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">4</div>
                  <div className="tip-content">
                    <h4>Follow Instructions</h4>
                    <p>Listen carefully to emergency operators or barangay officials. Do exactly as they advise.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">5</div>
                  <div className="tip-content">
                    <h4>Evacuate if Necessary</h4>
                    <p>If told to evacuate, leave immediately. Don't go back for personal belongings. Your safety comes first.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">6</div>
                  <div className="tip-content">
                    <h4>Prepare an Emergency Kit</h4>
                    <p>Keep essentials ready: water, flashlight, first-aid kit, important documents, and medications.</p>
                  </div>
                </div>
                <div className="tip-item">
                  <div className="tip-number">7</div>
                  <div className="tip-content">
                    <h4>Help Others if Safe</h4>
                    <p>Assist elderly, children, and persons with disabilities — only if it doesn't put you in danger.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Barangay Hall Hours */}
            <div className="hall-hours-card">
              <div className="hall-hours-header">
                <div className="hall-hours-icon-wrap">
                  <Clock size={22} strokeWidth={2} />
                </div>
                <h3 className="hall-hours-title">Barangay Hall Hours</h3>
              </div>

              <div className="hall-hours-body">
                <div className="hall-hours-building">
                  <MapPin size={18} strokeWidth={2} />
                  <span>Barangay Mabayuan, Olongapo City</span>
                </div>

                <div className="hall-hours-schedule">
                  <div className="schedule-row">
                    <span className="schedule-days">Monday – Sunday</span>
                    <span className="schedule-time">9:00 AM – 6:00 PM</span>
                  </div>
                </div>

                <div className="hall-hours-status">
                  {(() => {
                    const now = new Date();
                    const hours = now.getHours();
                    const isOpen = hours >= 9 && hours < 18;
                    return (
                      <div className={`status-badge ${isOpen ? 'status-open' : 'status-closed'}`}>
                        {isOpen ? (
                          <>
                            <CheckCircle2 size={16} strokeWidth={2.5} />
                            <span>Currently Open</span>
                          </>
                        ) : (
                          <>
                            <Clock size={16} strokeWidth={2.5} />
                            <span>Currently Closed</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="hotline-modal-overlay" onClick={handleCancelCall}>
          <div className="hotline-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="hotline-modal-close" onClick={handleCancelCall}>
              <X size={20} strokeWidth={2} />
            </button>
            <div className="hotline-modal-icon">
              <PhoneCall size={32} strokeWidth={1.8} />
            </div>
            <h3 className="hotline-modal-title">Confirm Call</h3>
            <p className="hotline-modal-message">
              Are you sure you want to call <strong>{selectedContact.name}</strong>?
            </p>
            <div className="hotline-modal-number">{selectedContact.number}</div>
            <div className="hotline-modal-actions">
              <button className="hotline-btn-cancel" onClick={handleCancelCall}>
                Cancel
              </button>
              <button className="hotline-btn-call" onClick={handleConfirmCall}>
                <PhoneCall size={18} strokeWidth={2} />
                Call Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyHotlines;
