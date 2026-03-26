import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-icon">🏛️</span>
            <span className="footer-text">iBayan Portal</span>
          </div>
          <div className="footer-copyright">
            <p>Barangay Mabayuan</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
