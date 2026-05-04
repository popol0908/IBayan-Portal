import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { validatePhoneNumber, validateRequired, validateName } from '../utils/validation';
import { XCircle, AlertTriangle, FileEdit, MapPin, Home as HomeIcon, Phone, FileText, Paperclip, Check, User, Calendar } from '../components/Icons';
import './Signup.css';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dypfxfpfz';
const CLOUDINARY_UPLOAD_PRESET = 'barangay_proofs';

const VerificationDeclined = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [contactNumber, setContactNumber] = useState('');
  const [purok, setPurok] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [errors, setErrors] = useState({
    fullName: '',
    birthday: '',
    permanentAddress: '',
    presentAddress: '',
    contactNumber: '',
    purok: '',
    proofFile: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile(data);
          setFullName(data.fullName || '');
          setBirthday(data.birthday || '');
          setPermanentAddress(data.permanentAddress || '');
          setPresentAddress(data.presentAddress || '');
          setContactNumber(data.contactNumber || '');
          setPurok(data.purok || '');
          setDeclineReason(data.declineReason || '');
        }
      } catch (error) {
        console.error('Error loading profile for resubmission:', error);
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setProofFile(null);
      setErrors(prev => ({ ...prev, proofFile: 'Proof of residency is required.' }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      const message = 'Invalid file type. Accepted: JPG, PNG, JPEG, PDF.';
      setProofFile(null);
      setErrors(prev => ({ ...prev, proofFile: message }));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const message = 'File size must not exceed 5MB.';
      setProofFile(null);
      setErrors(prev => ({ ...prev, proofFile: message }));
      return;
    }

    setProofFile(file);
    setErrors(prev => ({ ...prev, proofFile: '' }));
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      formData.append('folder', 'barangay_resubmissions'); // Organize resubmissions in a separate folder

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary error:', errorData);
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload proof. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const newErrors = {};

    const nameValidation = validateName(fullName);
    if (!nameValidation.isValid) newErrors.fullName = nameValidation.error;

    if (!birthday) {
      newErrors.birthday = "Birthday is required.";
    } else {
      const birthDate = new Date(birthday);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthday = "Birthday cannot be in the future.";
      } else {
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age < 18) {
          newErrors.birthday = "You must be at least 18 years old.";
        }
      }
    }

    const permAddrValidation = validateRequired(permanentAddress, 'Permanent address');
    if (!permAddrValidation.isValid) newErrors.permanentAddress = permAddrValidation.error;

    const presAddrValidation = validateRequired(presentAddress, 'Present address');
    if (!presAddrValidation.isValid) newErrors.presentAddress = presAddrValidation.error;

    const purokValidation = validateRequired(purok, 'Purok');
    if (!purokValidation.isValid) newErrors.purok = purokValidation.error;

    const phoneValidation = validatePhoneNumber(contactNumber);
    if (!phoneValidation.isValid) newErrors.contactNumber = phoneValidation.error;

    if (!proofFile) {
      newErrors.proofFile = 'Please upload an updated proof of residency.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fix the errors in the form.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Starting resubmission process...');
      console.log('Uploading proof to Cloudinary...');
      
      // Upload file to Cloudinary
      const proofUrl = await uploadToCloudinary(proofFile);
      
      console.log('Upload successful! URL:', proofUrl);
      console.log('Updating Firestore document...');

      // Update Firestore document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fullName,
        birthday,
        permanentAddress,
        presentAddress,
        purok,
        contactNumber,
        proofUrl,
        status: 'pending',
        declineReason: '',
        resubmittedAt: serverTimestamp()
      });

      console.log('Firestore updated successfully!');
      showToast('Verification resubmitted successfully!', 'success');
      
      // Small delay before navigation to ensure state updates
      setTimeout(() => {
        navigate('/verification/pending');
      }, 500);
    } catch (error) {
      console.error('Error resubmitting verification:', error);
      
      if (error.message.includes('upload')) {
        showToast(error.message, 'error');
      } else {
        showToast('Resubmission failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-wrapper verification-declined-wrapper">
        <div className="signup-form-section verification-declined-section">
          {/* Header with Icon */}
          <div className="verification-declined-header">
            <div className="decline-icon-wrapper">
              <span className="decline-icon"><XCircle size={48} strokeWidth={1.5} color="#dc3545" /></span>
            </div>
            <h1 className="signup-title decline-title">Verification Declined</h1>
            <p className="signup-subtitle decline-subtitle">
              Your verification was not approved. Please review the reason below and resubmit with the correct information.
            </p>
          </div>

          {/* Decline Reason Box */}
          {declineReason && (
            <div className="decline-reason-box">
              <div className="decline-reason-header">
                <span className="warning-icon"><AlertTriangle size={24} strokeWidth={2} color="#F59E0B" /></span>
                <h3>Reason for Decline</h3>
              </div>
              <p className="decline-reason-text">{declineReason}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="resubmit-instructions">
            <h3 className="instructions-title"><FileEdit size={22} strokeWidth={2} style={{marginRight: '8px', verticalAlign: '-4px'}} /> How to Resubmit</h3>
            <ul className="instructions-list">
              <li>Review the decline reason carefully</li>
              <li>Update your information with accurate details</li>
              <li>Upload a clear, valid proof of residency</li>
              <li>Double-check all fields before submitting</li>
            </ul>
          </div>

          {/* Resubmission Form */}
          <form onSubmit={handleSubmit} className="signup-form resubmit-form">
            <h3 className="form-section-title">Update Your Information</h3>
            
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><User size={16} strokeWidth={2.5} /></span>
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Calendar size={16} strokeWidth={2.5} /></span>
                Birthday *
              </label>
              <input
                type="date"
                name="birthday"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={`form-input ${errors.birthday ? 'input-error' : ''}`}
                disabled={loading}
              />
              {errors.birthday && <span className="field-error">{errors.birthday}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><MapPin size={16} strokeWidth={2.5} /></span>
                Permanent Address *
              </label>
              <input
                type="text"
                name="permanentAddress"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                className={`form-input ${errors.permanentAddress ? 'input-error' : ''}`}
                placeholder="Enter your permanent address"
                disabled={loading}
              />
              {errors.permanentAddress && <span className="field-error">{errors.permanentAddress}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><HomeIcon size={16} strokeWidth={2.5} /></span>
                Present Address *
              </label>
              <input
                type="text"
                name="presentAddress"
                value={presentAddress}
                onChange={(e) => setPresentAddress(e.target.value)}
                className={`form-input ${errors.presentAddress ? 'input-error' : ''}`}
                placeholder="Enter your present address"
                disabled={loading}
              />
              <div style={{ marginTop: "10px", marginBottom: "5px" }}>
                <label className="checkbox-container" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#4b5563", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setPresentAddress(permanentAddress);
                      else setPresentAddress("");
                    }}
                    disabled={loading}
                  />
                  Same as Permanent Address
                </label>
              </div>
              {errors.presentAddress && <span className="field-error">{errors.presentAddress}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><MapPin size={16} strokeWidth={2.5} /></span>
                Purok *
              </label>
              <select
                name="purok"
                value={purok}
                onChange={(e) => setPurok(e.target.value)}
                className={`form-input ${errors.purok ? 'input-error' : ''}`}
                disabled={loading}
              >
                <option value="" disabled>Select Purok</option>
                <option value="Purok 1">Purok 1</option>
                <option value="Purok 2">Purok 2</option>
                <option value="Purok 3">Purok 3</option>
                <option value="Purok 4">Purok 4</option>
                <option value="Purok 5">Purok 5</option>
                <option value="Purok 6">Purok 6</option>
                <option value="Purok 7">Purok 7</option>
              </select>
              {errors.purok && (
                <span className="field-error">{errors.purok}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Phone size={16} strokeWidth={2.5} /></span>
                Contact Number *
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className={`form-input ${errors.contactNumber ? 'input-error' : ''}`}
                placeholder="09XXXXXXXXX"
                disabled={loading}
              />
              {errors.contactNumber && (
                <span className="field-error">{errors.contactNumber}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><FileText size={16} strokeWidth={2.5} /></span>
                Updated Proof of Residency *
              </label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  name="proofFile"
                  id="proofFile"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={loading}
                />
                <label htmlFor="proofFile" className={`file-label ${errors.proofFile ? 'input-error' : ''}`}>
                  <span className="file-icon"><Paperclip size={18} strokeWidth={2.5} /></span>
                  <span className="file-text">
                    {proofFile ? proofFile.name : 'Choose file or drag here'}
                  </span>
                  <span className="file-button">Browse</span>
                </label>
              </div>
              <p className="file-help-text">Accepted: JPG, PNG, PDF (max 5MB)</p>
              {errors.proofFile && (
                <span className="field-error">{errors.proofFile}</span>
              )}
            </div>

            <div className="form-actions-resubmit">
              <button
                type="submit"
                className="btn btn-primary btn-full btn-resubmit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <span className="btn-icon"><Check size={18} strokeWidth={2.5} /></span>
                    Resubmit for Verification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerificationDeclined;
