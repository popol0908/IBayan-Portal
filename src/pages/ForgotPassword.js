import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { validateEmail } from "../utils/validation";
import {
  Mail,
  Send,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  KeyRound,
} from "lucide-react";
import "./ForgotPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const { resetPassword } = useAuth();

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
    if (globalError) setGlobalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setEmailError(validation.error);
      return;
    }

    try {
      setLoading(true);
      setGlobalError("");
      await resetPassword(email);
      setSubmitted(true);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/user-not-found") {
        // For security, show the same success message
        setSubmitted(true);
      } else if (error.code === "auth/invalid-email") {
        setEmailError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setGlobalError("Too many attempts. Please try again later.");
      } else {
        setGlobalError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-pw-container">
      <div className="forgot-pw-card">
        {/* Logo */}
        <div className="forgot-pw-logo">
          <img src="/logo.png" alt="Barangay Mabayuan" />
        </div>

        {!submitted ? (
          <>
            {/* Header */}
            <div className="forgot-pw-header">
              <div className="forgot-pw-icon-wrapper">
                <KeyRound size={28} strokeWidth={1.8} />
              </div>
              <h1 className="forgot-pw-title">Forgot Password?</h1>
              <p className="forgot-pw-subtitle">
                Enter the email address linked to your account and we'll send
                you a password reset link.
              </p>
            </div>

            {/* Global Error */}
            {globalError && (
              <div className="forgot-pw-error">
                <AlertTriangle size={16} strokeWidth={2} />
                {globalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="forgot-pw-form">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">
                    <Mail size={15} strokeWidth={2} />
                  </span>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={handleChange}
                  className={`form-input ${emailError ? "input-error" : ""}`}
                  placeholder="Enter your registered email"
                  disabled={loading}
                  autoFocus
                />
                {emailError && (
                  <span className="field-error">{emailError}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || email.trim() === ""}
              >
                {loading ? (
                  <>
                    <span className="btn-loading"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">
                      <Send size={18} strokeWidth={2} />
                    </span>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="forgot-pw-back">
              <Link to="/login" className="forgot-pw-back-link">
                <ArrowLeft size={16} strokeWidth={2} />
                Back to Login
              </Link>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="forgot-pw-success">
            <div className="forgot-pw-success-icon">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="forgot-pw-success-title">Check Your Email</h2>
            <p className="forgot-pw-success-text">
              If this email is registered, you will receive a password reset
              link shortly. Please check your inbox and spam folder.
            </p>
            <Link to="/login" className="btn btn-primary btn-full">
              <span className="btn-icon">
                <ArrowLeft size={18} strokeWidth={2} />
              </span>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
