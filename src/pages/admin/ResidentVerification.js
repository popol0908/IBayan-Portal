import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle, Users, MapPin, Phone, Cake, FileText, Paperclip, Clock, Download, X } from 'lucide-react';
import IconBox from '../../components/IconBox';
import { db } from '../../firebase';
import AdminNavbar from '../../components/AdminNavbar';
import { useToast } from '../../contexts/ToastContext';
import './ResidentVerification.css';

const iconProps = { size: 16, strokeWidth: 1.8 };

const ResidentVerification = () => {
  const { showToast } = useToast();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningUserId, setDecliningUserId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setPendingUsers(users);
      setLoading(false);
    }, (error) => {
      console.error('Error loading pending users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (userId) => {
    try {
      // Find the user to get their email
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) {
        showToast('User not found.', 'error');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'verified',
        declineReason: '',
        verifiedAt: serverTimestamp()
      });

      showToast('Resident approved successfully.', 'success');
    } catch (error) {
      console.error('Error approving resident:', error);
      showToast('Failed to approve resident.', 'error');
    }
  };

  const handleDeclineSubmit = async () => {
    if (!decliningUserId) return;
    
    try {
      // Find the user to get their email
      const user = pendingUsers.find(u => u.id === decliningUserId);
      if (!user) {
        showToast('User not found.', 'error');
        return;
      }

      const userRef = doc(db, 'users', decliningUserId);
      await updateDoc(userRef, {
        status: 'declined',
        declineReason: declineReason,
        declinedAt: serverTimestamp()
      });

      showToast('Resident declined successfully.', 'info');
      setShowDeclineModal(false);
      setDeclineReason('');
      setDecliningUserId(null);
    } catch (error) {
      console.error('Error declining resident:', error);
      showToast('Failed to decline resident.', 'error');
    }
  };

  const openProofModal = (user) => {
    setSelectedUser(user);
    setShowProofModal(true);
  };

  const openDeclineModal = (userId) => {
    setDecliningUserId(userId);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      <div className="admin-content">
        <div className="admin-container">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Resident Verification</h1>
              <p className="admin-page-subtitle">Review and approve registered residents</p>
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          {!loading && pendingUsers.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><CheckCircle size={48} strokeWidth={1.5} /></span>
              <h3>No Pending Residents</h3>
              <p>All resident verification requests have been processed.</p>
            </div>
          )}

          {!loading && pendingUsers.length > 0 && (
            <div className="verification-container">
              <div className="verification-stats">
                <div className="stat-card">
                  <IconBox variant="blue" size="sm"><Users size={20} strokeWidth={1.8} /></IconBox>
                  <div className="stat-content">
                    <p className="stat-label">Pending Verification</p>
                    <p className="stat-value">{pendingUsers.length}</p>
                  </div>
                </div>
              </div>

              <div className="residents-grid">
                {pendingUsers.map(user => (
                  <div key={user.id} className="resident-card">
                    <div className="card-header">
                      <div className="user-avatar">
                        {user.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <h3 className="user-name">{user.fullName}</h3>
                        <p className="user-email">{user.email}</p>
                      </div>
                      <span className="pending-badge"><Clock size={14} strokeWidth={1.8} style={{ marginRight: 4, verticalAlign: -2 }} />Pending</span>
                    </div>

                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-label"><MapPin {...iconProps} style={{ marginRight: 6, verticalAlign: -2 }} /> Address:</span>
                        <span className="info-value">{user.address}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label"><Phone {...iconProps} style={{ marginRight: 6, verticalAlign: -2 }} /> Contact:</span>
                        <span className="info-value">{user.contactNumber}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label"><Cake {...iconProps} style={{ marginRight: 6, verticalAlign: -2 }} /> Birthday:</span>
                        <span className="info-value">
                          {user.birthday ? new Date(user.birthday).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label"><FileText {...iconProps} style={{ marginRight: 6, verticalAlign: -2 }} /> Proof:</span>
                        {user.proofUrl ? (
                          <button
                            className="proof-link"
                            onClick={() => openProofModal(user)}
                          >
                            <Paperclip size={14} strokeWidth={1.8} style={{ marginRight: 4, verticalAlign: -2 }} />View Document
                          </button>
                        ) : (
                          <span className="info-value">No file</span>
                        )}
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn btn-approve"
                        onClick={() => handleApprove(user.id)}
                        title="Approve this resident"
                      >
                        <CheckCircle size={18} strokeWidth={1.8} style={{ marginRight: 6, verticalAlign: -3 }} />Approve
                      </button>
                      <button
                        className="btn btn-decline"
                        onClick={() => openDeclineModal(user.id)}
                        title="Decline this resident"
                      >
                        <X size={18} strokeWidth={1.8} style={{ marginRight: 6, verticalAlign: -3 }} />Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Proof Modal */}
      {showProofModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Proof of Residency - {selectedUser.fullName}</h2>
              <button className="modal-close" onClick={() => setShowProofModal(false)} aria-label="Close"><X size={20} strokeWidth={2} /></button>
            </div>
            <div className="modal-body">
              {selectedUser.proofUrl?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={selectedUser.proofUrl}
                  className="proof-viewer"
                  title="Proof Document"
                />
              ) : (
                <img
                  src={selectedUser.proofUrl}
                  alt="Proof of Residency"
                  className="proof-image"
                />
              )}
            </div>
            <div className="modal-footer">
              <a
                href={selectedUser.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Download size={18} strokeWidth={1.8} style={{ marginRight: 6, verticalAlign: -3 }} />Download
              </a>
              <button className="btn btn-secondary" onClick={() => setShowProofModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Decline Resident</h2>
              <button className="modal-close" onClick={() => setShowDeclineModal(false)} aria-label="Close"><X size={20} strokeWidth={2} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-message">Please provide a reason for declining (optional):</p>
              <textarea
                className="decline-textarea"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter decline reason..."
                rows="4"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeclineModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeclineSubmit}>
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentVerification;
