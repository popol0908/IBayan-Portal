import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, Lock, KeyRound, LogIn, AlertTriangle, Info, Home, Megaphone } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const { login, error, setError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (error) setError('');
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await login(formData.email, formData.password);
      const { user } = result;

      let status = 'pending';
      try {
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          status = snapshot.data().status || 'pending';
        }
      } catch (profileError) {
        console.error('Error fetching user profile for login redirect:', profileError);
      }

      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        if (status === 'verified') {
          navigate(from, { replace: true });
        } else if (status === 'declined') {
          navigate('/verification/declined', { replace: true });
        } else {
          navigate('/verification/pending', { replace: true });
        }
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        showToast('Incorrect email or password.', 'error');
        setError('Incorrect email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        showToast('Too many failed attempts. Please try again later.', 'error');
        setError('Too many failed attempts. Please try again later.');
      } else {
        showToast('Login failed. Please try again.', 'error');
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.email.trim() !== '' && formData.password.trim() !== '';

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side — Login Form */}
        <div className="login-form-section">
          <div className="login-logo">
            <img src="/logo.png" alt="Barangay Mabayuan" />
          </div>

          <div className="login-header">
            <h1 className="login-title">Welcome</h1>
            <p className="login-subtitle">Sign in to your IBayan Portal Account</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon"><AlertTriangle size={16} strokeWidth={2} /></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
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
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"><Lock size={15} strokeWidth={2} /></span>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                disabled={loading}
              />
              {errors.password && (
                <span className="field-error">{errors.password}</span>
              )}
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
                onClick={() => {
                  alert('Forgot password functionality will be implemented');
                }}
                disabled={loading}
              >
                <KeyRound size={14} strokeWidth={2.5} />
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <span className="btn-loading"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <span className="btn-icon"><LogIn size={18} strokeWidth={2} /></span>
                  Sign In
                </>
              )}
            </button>

            <div className="signup-prompt">
              <p>Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link></p>
            </div>
          </form>
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Right Side — Info */}
        <div className="login-info-section">
          <div className="info-block info-block--about">
            <h2 className="info-block__title"><span className="info-block__inline-icon"><Info size={20} strokeWidth={1.8} /></span> About Barangay Mabayuan</h2>
            <p className="info-block__text">
              Barangay Mabayuan is a vibrant community in Olongapo City, committed to serving our residents with dedication and excellence. Our iBayan Portal provides easy access to important announcements, services, and emergency alerts to keep our community informed and connected.
            </p>
          </div>

          <div className="info-block">
            <h3 className="info-block__title"><span className="info-block__inline-icon"><Megaphone size={18} strokeWidth={1.8} /></span> Stay Informed</h3>
            <p className="info-block__text">
              Get the latest announcements and emergency alerts from your barangay officials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
