import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../firebase';
import './AdminLogin.css';

const ChangePassword = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!formData.password) return 'New password is required';
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password))
      return 'Password must be at least 8 characters with 1 uppercase letter and 1 number';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    try {
      setLoading(true);
      setError('');

      // Update password in Firebase Auth
      await updatePassword(auth.currentUser, formData.password);

      // Clear the mustChangePassword flag in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        mustChangePassword: false
      }, { merge: true });

      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Session expired. Please log out and log back in, then change your password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-wrapper" style={{ gridTemplateColumns: '1fr' }}>
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">
              <img src="/logo.png" alt="Barangay Mabayuan" />
            </div>
            <h1 className="admin-login-title">Change Your Password</h1>
            <p className="admin-login-subtitle">
              You must set a new password before continuing to the admin portal.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon"><AlertTriangle size={16} strokeWidth={2} /></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Lock size={15} strokeWidth={2} /></span>
                New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={e => { setFormData(p => ({ ...p, password: e.target.value })); setError(''); }}
                  className="form-input form-input-password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  disabled={loading}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Lock size={15} strokeWidth={2} /></span>
                Confirm New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={e => { setFormData(p => ({ ...p, confirmPassword: e.target.value })); setError(''); }}
                  className="form-input form-input-password"
                  placeholder="Re-enter your new password"
                  required
                  disabled={loading}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirm(!showConfirm)} tabIndex="-1">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Updating Password...
                </>
              ) : (
                <>
                  <span className="btn-icon"><CheckCircle size={18} strokeWidth={2} /></span>
                  Set New Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
