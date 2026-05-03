import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Pencil, Lock, Eye, EyeOff, CheckCircle, Clock, XCircle,
  User, Mail, Phone, MapPin, Calendar, Home, Shield
} from 'lucide-react';
import PageLoader from '../components/PageLoader';
import './Profile.css';

const Profile = () => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editData, setEditData] = useState({
    contactNumber: '',
    presentAddress: '',
    permanentAddress: '',
    purok: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setEditData({
        contactNumber: userProfile.contactNumber || '',
        presentAddress: userProfile.presentAddress || '',
        permanentAddress: userProfile.permanentAddress || '',
        purok: userProfile.purok || ''
      });
    }
  }, [userProfile]);

  const validateEditForm = () => {
    const newErrors = {};

    if (editData.contactNumber.trim() === '') {
      newErrors.contactNumber = 'Contact number is required';
    }

    if (editData.presentAddress.trim() === '') {
      newErrors.presentAddress = 'Present address is required';
    }

    if (editData.permanentAddress.trim() === '') {
      newErrors.permanentAddress = 'Permanent address is required';
    }

    if (editData.purok.trim() === '') {
      newErrors.purok = 'Purok is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!validateEditForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        contactNumber: editData.contactNumber,
        presentAddress: editData.presentAddress,
        permanentAddress: editData.permanentAddress,
        purok: editData.purok,
        updatedAt: serverTimestamp()
      });

      showToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordData.newPassword);

      showToast('Password changed successfully!', 'success');
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/invalid-credential') {
        setErrors((prev) => ({ ...prev, currentPassword: 'Current password is incorrect' }));
        showToast('Current password is incorrect', 'error');
      } else {
        showToast('Failed to change password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'verified':
        return { label: 'Verified', color: 'status-green', Icon: CheckCircle };
      case 'emailUnverified':
      case 'pending':
        return { label: 'Pending Verification', color: 'status-amber', Icon: Clock };
      case 'declined':
        return { label: 'Declined', color: 'status-red', Icon: XCircle };
      default:
        return { label: 'Unknown', color: 'status-gray', Icon: Clock };
    }
  };

  const statusInfo = getStatusInfo(userProfile?.status);
  const StatusIcon = statusInfo.Icon;

  return (
    <PageLoader isLoading={!currentUser || !userProfile} loadingMessage="Loading profile...">
      <div className="profile-dashboard">
        <div className="profile-wrapper">
          
          {/* Profile Header */}
          <div className="profile-header-card">
            <div className="profile-avatar-large">
              {(userProfile?.fullName || currentUser?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="profile-header-details">
              <h1 className="profile-name-large">{userProfile?.fullName || 'Loading...'}</h1>
              <p className="profile-email-text">{currentUser?.email}</p>
              <div className={`profile-status-badge ${statusInfo.color}`}>
                <StatusIcon size={16} strokeWidth={2} />
                <span>{statusInfo.label}</span>
              </div>
            </div>
          </div>

          <div className="profile-grid">
            {/* Left Column: Personal Info */}
            <div className="profile-column">
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2 className="profile-card-title">
                    <User size={20} strokeWidth={2} />
                    Personal Information
                  </h2>
                  {!isEditing && (
                    <button
                      className="profile-edit-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil size={16} strokeWidth={2} />
                      Edit
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="profile-info-list">
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><User size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Full Name</span>
                        <span className="profile-info-value">{userProfile?.fullName || '—'}</span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><Mail size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Email Address</span>
                        <span className="profile-info-value">{currentUser?.email}</span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><Phone size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Contact Number</span>
                        <span className="profile-info-value">{userProfile?.contactNumber || '—'}</span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><Calendar size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Date of Birth</span>
                        <span className="profile-info-value">
                          {userProfile?.birthday
                            ? new Date(userProfile.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><Home size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Present Address</span>
                        <span className="profile-info-value">{userProfile?.presentAddress || '—'}</span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><MapPin size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Permanent Address</span>
                        <span className="profile-info-value">{userProfile?.permanentAddress || '—'}</span>
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <span className="profile-info-icon"><MapPin size={18} /></span>
                      <div className="profile-info-content">
                        <span className="profile-info-label">Purok</span>
                        <span className="profile-info-value">{userProfile?.purok || '—'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="profile-edit-form">
                    <div className="form-group">
                      <label className="form-label">Contact Number</label>
                      <input
                        type="tel"
                        name="contactNumber"
                        value={editData.contactNumber}
                        onChange={handleEditChange}
                        className={`form-input ${errors.contactNumber ? 'input-error' : ''}`}
                        disabled={loading}
                      />
                      {errors.contactNumber && <span className="field-error">{errors.contactNumber}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Present Address</label>
                      <input
                        type="text"
                        name="presentAddress"
                        value={editData.presentAddress}
                        onChange={handleEditChange}
                        className={`form-input ${errors.presentAddress ? 'input-error' : ''}`}
                        disabled={loading}
                      />
                      {errors.presentAddress && <span className="field-error">{errors.presentAddress}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Permanent Address</label>
                      <input
                        type="text"
                        name="permanentAddress"
                        value={editData.permanentAddress}
                        onChange={handleEditChange}
                        className={`form-input ${errors.permanentAddress ? 'input-error' : ''}`}
                        disabled={loading}
                      />
                      {errors.permanentAddress && <span className="field-error">{errors.permanentAddress}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Purok</label>
                      <select
                        name="purok"
                        value={editData.purok}
                        onChange={handleEditChange}
                        className={`form-select ${errors.purok ? 'input-error' : ''}`}
                        disabled={loading}
                      >
                        <option value="">Select Purok</option>
                        <option value="Purok 1">Purok 1</option>
                        <option value="Purok 2">Purok 2</option>
                        <option value="Purok 3">Purok 3</option>
                        <option value="Purok 4">Purok 4</option>
                        <option value="Purok 5">Purok 5</option>
                        <option value="Purok 6">Purok 6</option>
                        <option value="Purok 7">Purok 7</option>
                      </select>
                      {errors.purok && <span className="field-error">{errors.purok}</span>}
                    </div>

                    <div className="profile-form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={loading}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Security & Status */}
            <div className="profile-column">
              <div className="profile-card">
                <div className="profile-card-header">
                  <h2 className="profile-card-title">
                    <Shield size={20} strokeWidth={2} />
                    Account Security
                  </h2>
                  {!isChangingPassword && (
                    <button
                      className="profile-edit-btn"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <Lock size={16} strokeWidth={2} />
                      Change Password
                    </button>
                  )}
                </div>

                {isChangingPassword ? (
                  <form onSubmit={handleChangePassword} className="profile-edit-form">
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={`form-input form-input-password ${errors.currentPassword ? 'input-error' : ''}`}
                          disabled={loading}
                        />
                        <button type="button" className="password-toggle-btn" onClick={() => setShowCurrentPassword(!showCurrentPassword)} tabIndex="-1">
                          {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={`form-input form-input-password ${errors.newPassword ? 'input-error' : ''}`}
                          disabled={loading}
                        />
                        <button type="button" className="password-toggle-btn" onClick={() => setShowNewPassword(!showNewPassword)} tabIndex="-1">
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`form-input form-input-password ${errors.confirmPassword ? 'input-error' : ''}`}
                          disabled={loading}
                        />
                        <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex="-1">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
                    </div>

                    <div className="profile-form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => { setIsChangingPassword(false); setErrors({}); }} disabled={loading}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="profile-security-info">
                    <p className="profile-security-text">Keep your account secure by using a strong password. You can change your password anytime.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageLoader>
  );
};

export default Profile;
