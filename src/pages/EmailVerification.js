import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, RefreshCw, CheckCircle, LogOut, AlertTriangle, Clock } from 'lucide-react';
import './EmailVerification.css';

const RESEND_COOLDOWN_SECS = 60;
const POLL_INTERVAL_MS = 5000;

const EmailVerification = () => {
  const { currentUser, sendVerificationEmail, reloadUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleVerificationSuccess = useCallback(async () => {
    if (isVerified) return;
    try {
      setIsVerified(true);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        status: 'pending',
        emailVerifiedAt: serverTimestamp(),
      });
      showToast('Email verified! Redirecting to your account...', 'success');
      setTimeout(() => navigate('/verification/pending', { replace: true }), 2000);
    } catch (err) {
      console.error('Error updating verification status:', err);
      showToast('Verified! But failed to update status. Please contact support.', 'error');
    }
  }, [currentUser, isVerified, navigate, showToast]);

  // Check if already verified on mount
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.emailVerified) {
      handleVerificationSuccess();
    }
  }, [currentUser, handleVerificationSuccess]);

  // Auto-poll every 5 seconds
  useEffect(() => {
    if (!currentUser || isVerified) return;

    const interval = setInterval(async () => {
      const verified = await reloadUser();
      if (verified) {
        clearInterval(interval);
        handleVerificationSuccess();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [currentUser, isVerified, reloadUser, handleVerificationSuccess]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const verified = await reloadUser();
      if (verified) {
        await handleVerificationSuccess();
      } else {
        showToast('Email not verified yet. Please check your inbox.', 'error');
      }
    } catch (err) {
      showToast('Error checking verification. Please try again.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECS);
    const countdown = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendVerificationEmail();
      showToast('Verification email resent! Please check your inbox.', 'success');
      startResendCooldown();
    } catch (err) {
      if (err.code === 'auth/too-many-requests') {
        showToast('Too many attempts. Please wait a moment before trying again.', 'error');
      } else {
        showToast('Failed to resend email. Please try again.', 'error');
      }
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      showToast('Error signing out. Please try again.', 'error');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="ev-container">
      <div className="ev-card">
        {isVerified ? (
          <div className="ev-success">
            <div className="ev-success-icon">
              <CheckCircle size={72} strokeWidth={1.5} color="#22c55e" />
            </div>
            <h2 className="ev-success-title">Email Verified!</h2>
            <p className="ev-success-sub">Your email has been verified. Redirecting you now...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="ev-header">
              <div className="ev-icon-wrap">
                <Mail size={40} strokeWidth={1.5} color="#0052CC" />
              </div>
              <h1 className="ev-title">Verify Your Email</h1>
              <p className="ev-subtitle">
                We sent a verification link to:
              </p>
              <div className="ev-email-badge">{currentUser?.email}</div>
              <p className="ev-instruction">
                Click the link in your email to verify your account. The link expires in{' '}
                <strong>24 hours</strong>.
              </p>
            </div>

            {/* Steps */}
            <div className="ev-steps">
              <div className="ev-step">
                <div className="ev-step-num">1</div>
                <span>Open the email we sent you</span>
              </div>
              <div className="ev-step">
                <div className="ev-step-num">2</div>
                <span>Click the <strong>"Verify Email"</strong> link</span>
              </div>
              <div className="ev-step">
                <div className="ev-step-num">3</div>
                <span>Come back here — you'll be redirected automatically</span>
              </div>
            </div>

            {/* Actions */}
            <div className="ev-actions">
              <button
                className="ev-btn ev-btn-primary"
                onClick={handleCheckNow}
                disabled={checking || isVerified}
              >
                {checking ? (
                  <>
                    <RefreshCw size={16} className="ev-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    I've verified my email
                  </>
                )}
              </button>

              <button
                className="ev-btn ev-btn-outline"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
              >
                {resending ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock size={15} />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <Mail size={15} />
                    Resend verification email
                  </>
                )}
              </button>
            </div>

            {/* Tips */}
            <div className="ev-tips">
              <div className="ev-tips-header">
                <AlertTriangle size={15} strokeWidth={2} color="#f59e0b" />
                <span>Didn't receive the email?</span>
              </div>
              <ul className="ev-tips-list">
                <li>Check your <strong>spam</strong> or <strong>junk</strong> folder</li>
                <li>Make sure <strong>{currentUser?.email}</strong> is correct</li>
                <li>Wait a few minutes, then try resending</li>
              </ul>
            </div>

            {/* Polling indicator */}
            <p className="ev-polling-hint">
              <RefreshCw size={12} className="ev-spin-slow" />
              Checking automatically every few seconds...
            </p>

            {/* Logout */}
            <button className="ev-logout-btn" onClick={handleLogout}>
              <LogOut size={14} />
              Use a different account
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
