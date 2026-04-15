import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, LogIn, AlertTriangle, Shield, Users, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, error, setError, currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Redirect to admin dashboard if already logged in as admin
  useEffect(() => {
    if (currentUser && userProfile?.role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [currentUser, userProfile, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');
      
      const result = await login(formData.email, formData.password);
      console.log('Login successful. User UID:', result.user.uid);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      console.log('User profile exists:', userSnap.exists());
      console.log('User data:', userSnap.data());
      
      if (userSnap.exists() && userSnap.data().role === 'admin') {
        console.log('Admin role confirmed. Redirecting to dashboard.');
        navigate('/admin/dashboard');
      } else if (!userSnap.exists()) {
        await signOut(auth);
        setError('User profile not found. Please contact the administrator.');
        console.error('User profile document does not exist in Firestore');
      } else {
        await signOut(auth);
        setError('Access denied. This account does not have admin privileges.');
        console.warn('User is not an admin. Access denied.');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('Email not found.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-wrapper">
        {/* Left Side — Login Form */}
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-logo">
              <img src="/logo.png" alt="Barangay Mabayuan" />
            </div>
            <h1 className="admin-login-title">Admin Portal</h1>
            <p className="admin-login-subtitle">Sign in to your IBayan Admin Account</p>
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
                <span className="label-icon"><Mail size={15} strokeWidth={2} /></span>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="admin@barangay.gov"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Lock size={15} strokeWidth={2} /></span>
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input form-input-password"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                Remember me
              </label>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => alert('Password reset functionality will be implemented')}
                disabled={loading}
              >
                <KeyRound size={14} strokeWidth={2.5} />
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <span className="btn-icon"><LogIn size={18} strokeWidth={2} /></span>
                  Login to Admin Portal
                </>
              )}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="admin-login-divider" />

        {/* Right Side — Info */}
        <div className="admin-login-info">
          <div className="admin-info-block admin-info-block--main">
            <h2 className="admin-info-block__title">
              <span className="admin-info-block__inline-icon"><Building2 size={20} strokeWidth={1.8} /></span>
              Barangay Admin Center
            </h2>
            <p className="admin-info-block__text">
              Manage residents, announcements, emergency alerts, and community services for Barangay Mabayuan, Olongapo City.
            </p>
          </div>

          <div className="admin-info-block">
            <h3 className="admin-info-block__title">
              <span className="admin-info-block__inline-icon"><Users size={18} strokeWidth={1.8} /></span>
              Resident Management
            </h3>
            <p className="admin-info-block__text">
              Verify resident accounts, manage profiles, and maintain community records
            </p>
          </div>

          <div className="admin-info-block">
            <h3 className="admin-info-block__title">
              <span className="admin-info-block__inline-icon"><Shield size={18} strokeWidth={1.8} /></span>
              Secure Access
            </h3>
            <p className="admin-info-block__text">
              Role-based access control ensures only authorized personnel can manage the system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
