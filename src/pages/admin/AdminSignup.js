import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './AdminSignup.css';

const AdminSignup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const { signup, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signup(formData.email, formData.password, formData.fullName);
      
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Admin signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-signup-container">
      <div className="admin-signup-wrapper">
        <div className="admin-signup-card">
          <div className="admin-signup-header">
            <div className="admin-logo">
              <span className="logo-icon"><Building2 size={48} strokeWidth={1.5} /></span>
            </div>
            <h1 className="admin-signup-title">Create Admin Account</h1>
            <p className="admin-signup-subtitle">Register for Barangay Admin Portal</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon"><AlertTriangle size={20} strokeWidth={1.8} /></span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-signup-form">
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"></span>
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your full name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"></span>
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
                <span className="label-icon"></span>
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Create a password (min. 6 characters)"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon"></span>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Admin Account'
              )}
            </button>

            <div className="login-prompt">
              <p>Already have an account? <Link to="/admin/login" className="login-link">Login Here</Link></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;
