import React from 'react';
import { FileText, Shield, X } from './Icons';
import './LegalModals.css';

export const TermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h3 className="legal-modal-title"><FileText size={20} strokeWidth={2} /> Terms & Conditions</h3>
          <button type="button" className="legal-modal-close" onClick={onClose}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="legal-modal-body">
          <h4>1. Acceptance of Terms</h4>
          <p>By creating an account with the Barangay Mabayuan Information Center, you agree to comply with and be bound by these Terms and Conditions. This platform is strictly for the exclusive use of verified residents of Barangay Mabayuan, Olongapo City.</p>
          
          <h4>2. User Responsibilities and Accuracy of Information</h4>
          <p>You certify that all information provided during registration (including but not limited to your name, birthday, address, and proof of residency) is true, accurate, current, and complete. Submitting false, forged, or misleading documents constitutes a violation of these terms and may result in account termination and reporting to appropriate local authorities.</p>

          <h4>3. Account Security</h4>
          <p>You are solely responsible for maintaining the confidentiality of your login credentials. Any activity occurring under your account is your responsibility. You must immediately notify the Barangay administration of any unauthorized use or security breach of your account.</p>

          <h4>4. Use of the Platform</h4>
          <p>This platform is designed to disseminate announcements, manage event registrations, and facilitate barangay services. You agree not to use the platform for any unlawful purpose, to harass others, or to distribute spam or malicious software.</p>

          <h4>5. Modification and Termination</h4>
          <p>The Barangay Mabayuan Administration reserves the right to modify these terms at any time. We also reserve the right to suspend or terminate your access to the platform without prior notice if you are found to be in violation of these terms or if you are no longer a resident of the barangay.</p>
        </div>
        <div className="legal-modal-footer">
          <button type="button" className="legal-modal-btn" onClick={onClose}>I Understand</button>
        </div>
      </div>
    </div>
  );
};

export const PrivacyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h3 className="legal-modal-title"><Shield size={20} strokeWidth={2} /> Privacy Policy</h3>
          <button type="button" className="legal-modal-close" onClick={onClose}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="legal-modal-body">
          <h4>1. Introduction</h4>
          <p>The Barangay Mabayuan Administration respects your privacy and is committed to protecting your personal data in compliance with the Data Privacy Act of 2012 (Republic Act No. 10173). This policy explains how we collect, use, and protect your information.</p>
          
          <h4>2. Information We Collect</h4>
          <p>During registration and profiling, we collect personal information such as your full name, date of birth, address, contact details, civil status, occupation, and proof of residency documents. We may also log your activity within the platform for security and audit purposes.</p>

          <h4>3. How We Use Your Information</h4>
          <p>Your data is used exclusively for official barangay purposes, including: verifying your residency status, maintaining the official barangay census, communicating critical emergency alerts and announcements, and managing participation in local events and programs.</p>

          <h4>4. Data Sharing and Disclosure</h4>
          <p>We do not sell, trade, or rent your personal data to third parties. Your information will only be shared when legally required by law enforcement or government authorities, or when necessary to protect the safety and rights of the community.</p>

          <h4>5. Data Security and Retention</h4>
          <p>We implement strict security measures to protect your data against unauthorized access, alteration, or disclosure. Your documents (e.g., ID uploads) are stored securely. We retain your data only for as long as you are an active resident of Barangay Mabayuan or as required by local government regulations.</p>
        </div>
        <div className="legal-modal-footer">
          <button type="button" className="legal-modal-btn" onClick={onClose}>I Understand</button>
        </div>
      </div>
    </div>
  );
};
