import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { validatePhoneNumber, validateRequired } from '../utils/validation';
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
  const [houseNumber, setHouseNumber] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [errors, setErrors] = useState({
    contactNumber: '',
    purok: '',
    houseNumber: '',
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
          setContactNumber(data.contactNumber || '');
          setPurok(data.purok || '');
          setHouseNumber(data.houseNumber || '');
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

    const purokValidation = validateRequired(purok, 'Purok');
    if (!purokValidation.isValid) newErrors.purok = purokValidation.error;

    const houseValidation = validateRequired(houseNumber, 'House number');
    if (!houseValidation.isValid) newErrors.houseNumber = houseValidation.error;

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
        purok,
        houseNumber,
        address: `${purok} ${houseNumber}`.trim(),
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
              <span className="decline-icon">❌</span>
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
                <span className="warning-icon">⚠️</span>
                <h3>Reason for Decline</h3>
              </div>
              <p className="decline-reason-text">{declineReason}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="resubmit-instructions">
            <h3 className="instructions-title">📝 How to Resubmit</h3>
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
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📍</span>
                  Address (Purok) *
                </label>
                <input
                  type="text"
                  name="purok"
                  value={purok}
                  onChange={(e) => setPurok(e.target.value)}
                  className={`form-input ${errors.purok ? 'input-error' : ''}`}
                  placeholder="Enter your Purok"
                  disabled={loading}
                />
                {errors.purok && (
                  <span className="field-error">{errors.purok}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🏠</span>
                  House Number *
                </label>
                <input
                  type="text"
                  name="houseNumber"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className={`form-input ${errors.houseNumber ? 'input-error' : ''}`}
                  placeholder="Enter your house number"
                  disabled={loading}
                />
                {errors.houseNumber && (
                  <span className="field-error">{errors.houseNumber}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">📱</span>
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
                <span className="label-icon">📄</span>
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
                  <span className="file-icon">📎</span>
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
                    <span className="btn-icon">✓</span>
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
