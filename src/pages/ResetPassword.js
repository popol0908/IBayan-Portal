import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { validatePassword, validateConfirmPassword } from "../utils/validation";
import {
  Lock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
} from '../components/Icons';
import "./ResetPassword.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [codeValid, setCodeValid] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const auth = getAuth();

  // Verify the oobCode on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setCodeValid(false);
        setVerifying(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
        setCodeValid(true);
      } catch (error) {
        console.error("Invalid or expired reset code:", error);
        setCodeValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, auth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (globalError) setGlobalError("");
  };

  const validateForm = () => {
    const newErrors = {};

    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.isValid) {
      newErrors.newPassword = passwordValidation.error;
    }

    const confirmPasswordValidation = validateConfirmPassword(
      formData.newPassword,
      formData.confirmPassword
    );
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);
      setGlobalError("");
      await confirmPasswordReset(auth, oobCode, formData.newPassword);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch (error) {
      console.error("Password reset error:", error);
      if (error.code === "auth/expired-action-code") {
        setGlobalError(
          "This reset link has expired. Please request a new one."
        );
      } else if (error.code === "auth/invalid-action-code") {
        setGlobalError(
          "This reset link is invalid. Please request a new one."
        );
      } else if (error.code === "auth/weak-password") {
        setErrors((prev) => ({
          ...prev,
          newPassword: "Password is too weak. Use at least 8 characters.",
        }));
      } else {
        setGlobalError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.newPassword.trim() !== "" &&
    formData.confirmPassword.trim() !== "";

  // Loading state while verifying oobCode
  if (verifying) {
    return (
      <div className="reset-pw-container">
        <div className="reset-pw-card">
          <div className="reset-pw-logo">
            <img src="/logo.png" alt="Barangay Mabayuan" />
          </div>
          <div className="reset-pw-verifying">
            <span className="reset-pw-spinner"></span>
            <p>Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or expired link
  if (!codeValid) {
    return (
      <div className="reset-pw-container">
        <div className="reset-pw-card">
          <div className="reset-pw-logo">
            <img src="/logo.png" alt="Barangay Mabayuan" />
          </div>
          <div className="reset-pw-invalid">
            <div className="reset-pw-invalid-icon">
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="reset-pw-invalid-title">Invalid or Expired Link</h2>
            <p className="reset-pw-invalid-text">
              This reset link has expired or is invalid. Please request a new
              one.
            </p>
            <Link to="/forgot-password" className="btn btn-primary btn-full">
              <span className="btn-icon">
                <KeyRound size={18} strokeWidth={2} />
              </span>
              Request New Link
            </Link>
            <div className="reset-pw-back">
              <Link to="/login" className="reset-pw-back-link">
                <ArrowLeft size={16} strokeWidth={2} />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-pw-container">
      <div className="reset-pw-card">
        {/* Logo */}
        <div className="reset-pw-logo">
          <img src="/logo.png" alt="Barangay Mabayuan" />
        </div>

        {!success ? (
          <>
            {/* Header */}
            <div className="reset-pw-header">
              <div className="reset-pw-icon-wrapper">
                <Lock size={28} strokeWidth={1.8} />
              </div>
              <h1 className="reset-pw-title">Reset Your Password</h1>
              <p className="reset-pw-subtitle">
                Enter a new password for <strong>{email}</strong>
              </p>
            </div>

            {/* Global Error */}
            {globalError && (
              <div className="reset-pw-error">
                <AlertTriangle size={16} strokeWidth={2} />
                {globalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="reset-pw-form">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">
                    <Lock size={15} strokeWidth={2} />
                  </span>
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.newPassword ? "input-error" : ""}`}
                  placeholder="Create a new password (min. 8 characters)"
                  disabled={loading}
                  autoFocus
                />
                {errors.newPassword && (
                  <span className="field-error">{errors.newPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">
                    <ShieldCheck size={15} strokeWidth={2} />
                  </span>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${errors.confirmPassword ? "input-error" : ""}`}
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <span className="field-error">{errors.confirmPassword}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <>
                    <span className="btn-loading"></span>
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">
                      <ShieldCheck size={18} strokeWidth={2} />
                    </span>
                    Reset Password
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="reset-pw-success">
            <div className="reset-pw-success-icon">
              <CheckCircle size={48} strokeWidth={1.5} />
            </div>
            <h2 className="reset-pw-success-title">Password Reset Successful!</h2>
            <p className="reset-pw-success-text">
              Your password has been updated. Redirecting to login...
            </p>
            <div className="reset-pw-redirect-bar">
              <div className="reset-pw-redirect-progress"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
