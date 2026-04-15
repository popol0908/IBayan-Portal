import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Hourglass,
  Home,
  AlertTriangle,
  Megaphone,
  Lock,
  CheckCircle,
  ClipboardList,
  Clock,
  HelpCircle,
} from "lucide-react";
import "./PendingVerification.css";

const PendingVerification = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleGoToAnnouncements = () => {
    navigate("/announcements");
  };

  const handleGoToProfile = () => {
    navigate("/profile");
  };

  const lockedFeatures = [
    {
      icon: <Home size={40} strokeWidth={1.5} />,
      name: "Home",
      description: "Dashboard and resident services",
      locked: true,
    },
    {
      icon: <AlertTriangle size={40} strokeWidth={1.5} />,
      name: "Emergency Alerts",
      description: "Real-time emergency notifications",
      locked: true,
    },
  ];

  const availableFeatures = [
    {
      icon: <Megaphone size={40} strokeWidth={1.5} />,
      name: "Announcements",
      description: "View public announcements",
      locked: false,
    },
  ];

  return (
    <div className="pending-container">
      <div className="pending-content">
        <div className="pending-wrapper">
          {/* Status Card */}
          <div className="status-card">
            <div className="status-icon">
              <Hourglass size={64} strokeWidth={1.5} color="#0052CC" />
            </div>
            <h1 className="status-title">Verification Pending</h1>
            <p className="status-email">{currentUser?.email}</p>
            <p className="status-message">
              Your account is under review. We're verifying your proof of residency.
            </p>
            <div className="status-timeline">
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-label">Account Created</div>
              </div>
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-label">Proof Submitted</div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-label">Verification Complete</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="features-section">
            <h2 className="section-title">Feature Access</h2>

            {/* Locked Features */}
            <div className="features-group">
              <h3 className="group-title">
                <Lock
                  size={20}
                  strokeWidth={2.5}
                  style={{ marginRight: "8px", verticalAlign: "-4px" }}
                />{" "}
                Locked Until Verified
              </h3>
              <div className="features-grid">
                {lockedFeatures.map((feature, index) => (
                  <div key={index} className="feature-card locked">
                    <div className="feature-header">
                      <span className="feature-icon">{feature.icon}</span>
                      <span className="lock-badge">
                        <Lock size={16} strokeWidth={2.5} />
                      </span>
                    </div>
                    <h4 className="feature-name">{feature.name}</h4>
                    <p className="feature-description">{feature.description}</p>
                    <div className="feature-status">
                      <span className="status-badge locked-badge">Locked</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Features */}
            <div className="features-group">
              <h3 className="group-title">
                <CheckCircle
                  size={20}
                  strokeWidth={2.5}
                  color="#4caf50"
                  style={{ marginRight: "8px", verticalAlign: "-4px" }}
                />{" "}
                Available Now
              </h3>
              <div className="features-grid">
                {availableFeatures.map((feature, index) => (
                  <div key={index} className="feature-card available">
                    <div className="feature-header">
                      <span className="feature-icon">{feature.icon}</span>
                      <span className="check-badge">
                        <CheckCircle
                          size={16}
                          strokeWidth={2.5}
                          color="#4caf50"
                        />
                      </span>
                    </div>
                    <h4 className="feature-name">{feature.name}</h4>
                    <p className="feature-description">{feature.description}</p>
                    <button
                      className="feature-btn"
                      onClick={handleGoToAnnouncements}
                    >
                      Access →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="info-section">
            <div className="info-card">
              <h3 className="info-title">
                <ClipboardList
                  size={22}
                  strokeWidth={2}
                  style={{ marginRight: "8px", verticalAlign: "-4px" }}
                />{" "}
                What's Being Verified?
              </h3>
              <ul className="info-list">
                <li>Your proof of residency document</li>
                <li>Your personal information accuracy</li>
                <li>Your eligibility as a barangay resident</li>
              </ul>
            </div>

            <div className="info-card">
              <h3 className="info-title">
                <Clock
                  size={22}
                  strokeWidth={2}
                  style={{ marginRight: "8px", verticalAlign: "-4px" }}
                />{" "}
                How Long Does It Take?
              </h3>
              <p className="info-text">
                Verification typically takes 1-3 business days. You'll receive a
                notification once your account is approved or if additional
                information is needed.
              </p>
            </div>

            <div className="info-card">
              <h3 className="info-title">
                <HelpCircle
                  size={22}
                  strokeWidth={2}
                  style={{ marginRight: "8px", verticalAlign: "-4px" }}
                />{" "}
                Need Help?
              </h3>
              <p className="info-text">
                You can view your profile and contact information. If you have
                questions about your verification status, please contact the
                barangay office.
              </p>
              <button className="btn btn-secondary" onClick={handleGoToProfile}>
                View Your Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
