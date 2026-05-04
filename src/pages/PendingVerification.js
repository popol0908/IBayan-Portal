import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Hourglass, ArrowRight, User } from '../components/Icons';
import "./PendingVerification.css";

const PendingVerification = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="pending-verification-page">
      <div className="pending-verification-card">
        <div className="pending-icon-wrapper">
          <div className="pending-icon-pulse"></div>
          <Hourglass size={48} strokeWidth={1.5} className="pending-icon" />
        </div>

        <h1 className="pending-title">Verification Pending</h1>
        <p className="pending-subtitle">
          Thank you for registering, <strong>{currentUser?.displayName || currentUser?.email}</strong>.
        </p>

        <div className="pending-message-box">
          <p>
            Your account is currently under review by the Barangay Administration. We are verifying your proof of residency.
          </p>
          <p>
            This process typically takes <strong>1-3 business days</strong>. You will receive an email notification once your account has been approved.
          </p>
        </div>

        <div className="pending-actions">
          <button className="btn btn-primary btn-full" onClick={() => navigate("/announcements")}>
            View Public Announcements <ArrowRight size={16} style={{ marginLeft: "8px" }} />
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => navigate("/profile")}>
            <User size={16} style={{ marginRight: "8px" }} /> View Your Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
