import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import './Profile.css';

const Profile = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editData, setEditData] = useState({
    contactNumber: '',
    address: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setEditData({
        contactNumber: userProfile.contactNumber || '',
        address: userProfile.address || ''
      });
    }
  }, [userProfile]);

  const validateEditForm = () => {
    const newErrors = {};

    if (editData.contactNumber.trim() === '') {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^(\+63|0)[0-9]{10}$/.test(editData.contactNumber.replace(/\s/g, ''))) {
      newErrors.contactNumber = 'Invalid Philippine phone number format';
    }

    if (editData.address.trim() === '') {
      newErrors.address = 'Address is required';
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
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!validateEditForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating profile with:', { contactNumber: editData.contactNumber, address: editData.address });
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        contactNumber: editData.contactNumber,
        address: editData.address,
        updatedAt: serverTimestamp()
      });

      showToast('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'permission-denied') {
        showToast('Permission denied. You do not have access to update this profile.', 'error');
      } else {
        showToast('Failed to update profile. Please try again.', 'error');
      }
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

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordData.newPassword);

      showToast('Password changed successfully!', 'success');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({
          ...prev,
          currentPassword: 'Current password is incorrect'
        }));
        showToast('Current password is incorrect', 'error');
      } else {
        showToast('Failed to change password. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Failed to logout', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return '#4caf50';
      case 'pending':
        return '#ffc107';
      case 'declined':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'verified':
        return '✅ Verified';
      case 'pending':
        return '⏳ Pending';
      case 'declined':
        return '❌ Declined';
      default:
        return 'Unknown';
    }
  };

  // Show profile even if loading, with skeleton/placeholder for missing data
  if (!currentUser) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <div className="loading-container">
            <div className="loading-spinner">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-wrapper">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              {(userProfile?.fullName || currentUser?.email)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{userProfile?.fullName || 'Loading...'}</h1>
              <p className="profile-email">{currentUser.email}</p>
              <span
                className="profile-status"
                style={{ borderColor: getStatusColor(userProfile?.status) }}
              >
                {getStatusLabel(userProfile?.status)}
              </span>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Personal Information</h2>
              {!isEditing && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="info-grid">
                <div className="info-item">
                  <label className="info-label">Full Name</label>
                  <p className="info-value">{userProfile?.fullName || 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Email Address</label>
                  <p className="info-value">{currentUser.email}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Contact Number</label>
                  <p className="info-value">{userProfile?.contactNumber || 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Address</label>
                  <p className="info-value">{userProfile?.address || 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">House Number</label>
                  <p className="info-value">{userProfile?.houseNumber || 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Date of Birth</label>
                  <p className="info-value">
                    {userProfile?.birthday
                      ? new Date(userProfile.birthday).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not provided'}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="edit-form">
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={editData.contactNumber}
                    onChange={handleEditChange}
                    className={`form-input ${errors.contactNumber ? 'input-error' : ''}`}
                    placeholder="+63 or 0 followed by 10 digits"
                    disabled={loading}
                  />
                  {errors.contactNumber && (
                    <span className="field-error">{errors.contactNumber}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={editData.address}
                    onChange={handleEditChange}
                    className={`form-input ${errors.address ? 'input-error' : ''}`}
                    placeholder="Enter your address"
                    disabled={loading}
                  />
                  {errors.address && (
                    <span className="field-error">{errors.address}</span>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Details Section */}
          <div className="profile-section">
            <h2 className="section-title">Account Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <label className="info-label">Account Status</label>
                <p className="info-value" style={{ color: getStatusColor(userProfile?.status) }}>
                  {getStatusLabel(userProfile?.status)}
                </p>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="profile-section">
            <div className="section-header">
              <h2 className="section-title">Security</h2>
              {!isChangingPassword && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsChangingPassword(true)}
                >
                  🔐 Change Password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={handleChangePassword} className="edit-form">
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${errors.currentPassword ? 'input-error' : ''}`}
                    placeholder="Enter your current password"
                    disabled={loading}
                  />
                  {errors.currentPassword && (
                    <span className="field-error">{errors.currentPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${errors.newPassword ? 'input-error' : ''}`}
                    placeholder="Enter new password (min. 6 characters)"
                    disabled={loading}
                    minLength={6}
                  />
                  {errors.newPassword && (
                    <span className="field-error">{errors.newPassword}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm new password"
                    disabled={loading}
                    minLength={6}
                  />
                  {errors.confirmPassword && (
                    <span className="field-error">{errors.confirmPassword}</span>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setErrors({});
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Logout Section */}
          <div className="profile-section logout-section">
            <button className="btn btn-danger btn-lg" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
