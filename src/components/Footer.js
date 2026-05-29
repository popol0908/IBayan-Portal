import React from 'react';
import { Landmark } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="footer-icon"><Landmark size={22} strokeWidth={2.2} /></span>
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
