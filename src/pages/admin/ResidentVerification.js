import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle, Users, Phone, Cake, Paperclip, Clock, Download, X, ShieldCheck, ShieldX, AlertTriangle, MapPin, Calendar } from 'lucide-react';
import IconBox from '../../components/IconBox';
import { db } from '../../firebase';
import AdminNavbar from '../../components/AdminNavbar';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { addActivityLog } from '../../services/activityLogService';
import './ResidentVerification.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return null;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getAddress = (user) => {
  if (user.presentAddress) return user.presentAddress;
  if (user.permanentAddress) return user.permanentAddress;
  if (user.address) return user.address;
  return 'N/A';
};

const ResidentVerification = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [declinedUsers, setDeclinedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    let loadedCount = 0;
    const checkDone = () => { loadedCount++; if (loadedCount >= 3) setLoading(false); };

    const qPending = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setPendingUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      checkDone();
    }, (err) => { console.error('Error loading pending:', err); checkDone(); });

    const qVerified = query(collection(db, 'users'), where('status', '==', 'verified'));
    const unsubVerified = onSnapshot(qVerified, (snapshot) => {
      setVerifiedUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      checkDone();
    }, (err) => { console.error('Error loading verified:', err); checkDone(); });

    const qDeclined = query(collection(db, 'users'), where('status', '==', 'declined'));
    const unsubDeclined = onSnapshot(qDeclined, (snapshot) => {
      setDeclinedUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      checkDone();
    }, (err) => { console.error('Error loading declined:', err); checkDone(); });

    return () => { unsubPending(); unsubVerified(); unsubDeclined(); };
  }, []);

  const openApproveModal = (userId) => {
    setApprovingUserId(userId);
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async () => {
    if (!approvingUserId) return;
    try {
      const userRef = doc(db, 'users', approvingUserId);
      await updateDoc(userRef, {
        status: 'verified',
        declineReason: '',
        verifiedAt: serverTimestamp()
      });
      showToast('Resident approved successfully.', 'success');
      
      // Log activity
      const approvedUser = [...pendingUsers, ...verifiedUsers, ...declinedUsers].find(u => u.id === approvingUserId);
      addActivityLog('approved', 'residents', `Approved resident "${approvedUser?.fullName || 'Unknown'}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      
      // Notify the resident
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          userId: approvingUserId,
          role: 'resident',
          title: 'Account Verified',
          message: 'Your account has been verified by the barangay admin.',
          type: 'system',
          read: false,
          createdAt: serverTimestamp(),
          link: '/dashboard',
        });
      } catch (notifErr) {
        console.error('Error sending verification notification:', notifErr);
      }

      setShowApproveModal(false);
      setApprovingUserId(null);
    } catch (error) {
      console.error('Error approving resident:', error);
      showToast('Failed to approve resident.', 'error');
    }
  };

  const handleDeclineSubmit = async () => {
    if (!decliningUserId) return;
    try {
      const userRef = doc(db, 'users', decliningUserId);
      await updateDoc(userRef, {
        status: 'declined',
        declineReason: declineReason,
        declinedAt: serverTimestamp()
      });
      showToast('Resident declined successfully.', 'info');
      
      // Log activity
      const declinedUser = [...pendingUsers, ...verifiedUsers, ...declinedUsers].find(u => u.id === decliningUserId);
      addActivityLog('declined', 'residents', `Declined resident "${declinedUser?.fullName || 'Unknown'}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      setShowDeclineModal(false);
      setDeclineReason('');
      setDecliningUserId(null);
    } catch (error) {
      console.error('Error declining resident:', error);
      showToast('Failed to decline resident.', 'error');
    }
  };

  const openProofModal = (user) => { setSelectedUser(user); setShowProofModal(true); };
  const openDetailModal = (user) => { setSelectedUser(user); setShowDetailModal(true); };
  const openDeclineModal = (userId) => { setDecliningUserId(userId); setDeclineReason(''); setShowDeclineModal(true); };

  const activeUsers = activeTab === 'pending' ? pendingUsers : activeTab === 'verified' ? verifiedUsers : declinedUsers;

  const renderCard = (user) => {
    const status = activeTab;
    return (
      <div key={user.id} className="rv-card">
        {/* Card top row: avatar + name + badge */}
        <div className="rv-card-top">
          <div className={`rv-avatar rv-avatar-${status}`}>
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="rv-card-identity">
            <h3 className="rv-card-name">{user.fullName}</h3>
            <p className="rv-card-email">{user.email}</p>
          </div>
          <span className={`rv-badge rv-badge-${status}`}>
            {status === 'pending' && <><Clock size={12} /> Pending</>}
            {status === 'verified' && <><ShieldCheck size={12} /> Verified</>}
            {status === 'declined' && <><ShieldX size={12} /> Declined</>}
          </span>
        </div>

        {/* Compact detail chips */}
        <div className="rv-card-details">
          <div className="rv-chip" title={getAddress(user)}>
            <MapPin size={13} />
            <span>{user.purok || getAddress(user)}</span>
          </div>
          <div className="rv-chip">
            <Phone size={13} />
            <span>{user.contactNumber || 'N/A'}</span>
          </div>
          <div className="rv-chip">
            <Cake size={13} />
            <span>{user.birthday ? new Date(user.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
          </div>
          {user.proofUrl && (
            <button className="rv-chip rv-chip-link" onClick={() => openProofModal(user)}>
              <Paperclip size={13} />
              <span>View Proof</span>
            </button>
          )}
        </div>

        {/* Status-specific info */}
        {status === 'verified' && user.verifiedAt && (
          <div className="rv-card-meta rv-meta-verified">
            <Calendar size={13} /> Approved {formatTimestamp(user.verifiedAt)}
          </div>
        )}
        {status === 'declined' && (
          <>
            {user.declinedAt && (
              <div className="rv-card-meta rv-meta-declined">
                <Calendar size={13} /> Declined {formatTimestamp(user.declinedAt)}
              </div>
            )}
            {user.declineReason && (
              <div className="rv-decline-reason">
                <AlertTriangle size={13} />
                <span>{user.declineReason}</span>
              </div>
            )}
          </>
        )}

        {/* Footer: actions or "View Details" */}
        <div className="rv-card-footer">
          <button className="rv-btn-ghost" onClick={() => openDetailModal(user)}>
            View Full Details
          </button>
          {status === 'pending' && (
            <div className="rv-card-actions">
              <button className="rv-btn rv-btn-approve" onClick={() => openApproveModal(user.id)}>
                <CheckCircle size={15} /> Approve
              </button>
              <button className="rv-btn rv-btn-decline" onClick={() => openDeclineModal(user.id)}>
                <X size={15} /> Decline
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      <div className="admin-content">
        <div className="admin-container">
          {/* Header */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Resident Verification</h1>
              <p className="admin-page-subtitle">Review and manage registered residents</p>
            </div>
          </div>

          {/* Summary Stats — always visible */}
          {!loading && (
            <div className="rv-stats-row">
              <button className={`rv-stat ${activeTab === 'pending' ? 'rv-stat-active' : ''}`} onClick={() => setActiveTab('pending')}>
                <IconBox variant="amber" size="sm"><Clock size={18} strokeWidth={1.8} /></IconBox>
                <div>
                  <span className="rv-stat-num">{pendingUsers.length}</span>
                  <span className="rv-stat-label">Pending</span>
                </div>
              </button>
              <button className={`rv-stat ${activeTab === 'verified' ? 'rv-stat-active' : ''}`} onClick={() => setActiveTab('verified')}>
                <IconBox variant="green" size="sm"><ShieldCheck size={18} strokeWidth={1.8} /></IconBox>
                <div>
                  <span className="rv-stat-num">{verifiedUsers.length}</span>
                  <span className="rv-stat-label">Verified</span>
                </div>
              </button>
              <button className={`rv-stat ${activeTab === 'declined' ? 'rv-stat-active' : ''}`} onClick={() => setActiveTab('declined')}>
                <IconBox variant="red" size="sm"><ShieldX size={18} strokeWidth={1.8} /></IconBox>
                <div>
                  <span className="rv-stat-num">{declinedUsers.length}</span>
                  <span className="rv-stat-label">Declined</span>
                </div>
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          {/* Cards Grid */}
          {!loading && activeUsers.length > 0 && (
            <div className="rv-grid">
              {activeUsers.map(user => renderCard(user))}
            </div>
          )}

          {/* Empty */}
          {!loading && activeUsers.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">
                {activeTab === 'pending' && <Clock size={48} strokeWidth={1.5} />}
                {activeTab === 'verified' && <ShieldCheck size={48} strokeWidth={1.5} />}
                {activeTab === 'declined' && <ShieldX size={48} strokeWidth={1.5} />}
              </span>
              <h3>
                {activeTab === 'pending' && 'No Pending Residents'}
                {activeTab === 'verified' && 'No Verified Residents'}
                {activeTab === 'declined' && 'No Declined Residents'}
              </h3>
              <p>
                {activeTab === 'pending' && 'All verification requests have been processed.'}
                {activeTab === 'verified' && 'No residents have been verified yet.'}
                {activeTab === 'declined' && 'No residents have been declined.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ====== DETAIL MODAL ====== */}
      {showDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Resident Details</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-top">
                <div className="rv-avatar rv-avatar-lg">{selectedUser.fullName?.charAt(0).toUpperCase()}</div>
                <div>
                  <h3 className="detail-name">{selectedUser.fullName}</h3>
                  <p className="detail-email">{selectedUser.email}</p>
                </div>
              </div>
              <div className="detail-grid">
                {selectedUser.permanentAddress && (
                  <div className="detail-item">
                    <span className="detail-label">Permanent Address</span>
                    <span className="detail-value">{selectedUser.permanentAddress}</span>
                  </div>
                )}
                {selectedUser.presentAddress && (
                  <div className="detail-item">
                    <span className="detail-label">Present Address</span>
                    <span className="detail-value">{selectedUser.presentAddress}</span>
                  </div>
                )}
                {!selectedUser.permanentAddress && selectedUser.address && (
                  <div className="detail-item">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{selectedUser.address}</span>
                  </div>
                )}
                {selectedUser.purok && (
                  <div className="detail-item">
                    <span className="detail-label">Purok</span>
                    <span className="detail-value">{selectedUser.purok}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Contact Number</span>
                  <span className="detail-value">{selectedUser.contactNumber || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Birthday</span>
                  <span className="detail-value">{selectedUser.birthday ? new Date(selectedUser.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                </div>
                {selectedUser.verifiedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Approved On</span>
                    <span className="detail-value">{formatTimestamp(selectedUser.verifiedAt)}</span>
                  </div>
                )}
                {selectedUser.declinedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Declined On</span>
                    <span className="detail-value">{formatTimestamp(selectedUser.declinedAt)}</span>
                  </div>
                )}
                {selectedUser.declineReason && (
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Decline Reason</span>
                    <span className="detail-value">{selectedUser.declineReason}</span>
                  </div>
                )}
                {selectedUser.proofUrl && (
                  <div className="detail-item detail-item-full">
                    <span className="detail-label">Proof of Residency</span>
                    <button className="rv-btn-ghost" onClick={() => { setShowDetailModal(false); openProofModal(selectedUser); }} style={{ marginTop: '0.35rem' }}>
                      <Paperclip size={14} /> View Document
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== PROOF MODAL ====== */}
      {showProofModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Proof — {selectedUser.fullName}</h2>
              <button className="modal-close" onClick={() => setShowProofModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {selectedUser.proofUrl?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={selectedUser.proofUrl} className="proof-viewer" title="Proof Document" />
              ) : (
                <img src={selectedUser.proofUrl} alt="Proof of Residency" className="proof-image" />
              )}
            </div>
            <div className="modal-footer">
              <a href={selectedUser.proofUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Download size={16} style={{ marginRight: 6 }} /> Download
              </a>
              <button className="btn btn-secondary" onClick={() => setShowProofModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== DECLINE MODAL ====== */}
      {showDeclineModal && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Decline Resident</h2>
              <button className="modal-close" onClick={() => setShowDeclineModal(false)}><X size={20} /></button>
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
              <button className="btn btn-secondary" onClick={() => setShowDeclineModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeclineSubmit}>Confirm Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== APPROVE CONFIRMATION MODAL ====== */}
      {showApproveModal && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Approve Resident</h2>
              <button className="modal-close" onClick={() => setShowApproveModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-message">Are you sure you want to approve this resident? They will gain full access to the system.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button className="btn btn-approve-confirm" onClick={handleApproveSubmit}>
                <CheckCircle size={16} /> Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentVerification;
