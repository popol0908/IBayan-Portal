import React, { useState, useEffect, useRef } from 'react';
import {
  X, Eye, Trash2, Users, Home, Clock, CheckCircle,
  AlertTriangle, Printer, Search, Save,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useToast } from '../../contexts/ToastContext';
import IconBox from '../../components/IconBox';
import AdminNavbar from '../../components/AdminNavbar';
import HouseholdPrintView from './HouseholdPrintView';
import { addActivityLog } from '../../services/activityLogService';
import { useAuth } from '../../contexts/AuthContext';
import './HouseholdProfiling.css';
import '../../styles/admin-common.css';

/* ── Constants ── */
const PUROK_OPTIONS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];

/* ── Helpers ── */
const formatDate = (d) => {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ================================================
   MAIN COMPONENT
   ================================================ */
const HouseholdProfiling = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();

  /* ── State ── */
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purokFilter, setPurokFilter] = useState('all');

  // Submitter names cache: uid -> fullName
  const [submitterNames, setSubmitterNames] = useState({});

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);

  // PSG code inline edit (inside view modal)
  const [psgCode, setPsgCode] = useState('');
  const [savingPsg, setSavingPsg] = useState(false);

  // Print
  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedHousehold ? `Household-${selectedHousehold.householdNo}` : 'Household',
    pageStyle: `@page { size: landscape !important; margin: 10mm; }`,
  });

  /* ── Real-time Firestore listener ── */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'households'), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHouseholds(data);
      setLoading(false);

      // Fetch submitter names for any new UIDs
      data.forEach((h) => {
        if (h.submittedBy && !submitterNames[h.submittedBy]) {
          fetchSubmitterName(h.submittedBy);
        }
      });
    }, (err) => {
      console.error('Error subscribing to households:', err);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubmitterName = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setSubmitterNames((prev) => ({ ...prev, [uid]: userDoc.data().fullName || userDoc.data().email || 'Unknown' }));
      } else {
        setSubmitterNames((prev) => ({ ...prev, [uid]: 'Unknown User' }));
      }
    } catch {
      setSubmitterNames((prev) => ({ ...prev, [uid]: 'Unknown User' }));
    }
  };

  /* ── Derived data ── */
  const totalMembers = households.reduce((sum, h) => sum + (h.members?.length || 0), 0);
  const pendingCount = households.filter((h) => h.status === 'pending').length;
  const approvedCount = households.filter((h) => h.status === 'approved').length;

  const filteredHouseholds = households.filter((h) => {
    const name = submitterNames[h.submittedBy] || '';
    const matchesSearch =
      searchQuery === '' ||
      (h.householdNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.street || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.purok || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
    const matchesPurok = purokFilter === 'all' || h.purok === purokFilter;
    return matchesSearch && matchesStatus && matchesPurok;
  });

  /* ── Actions ── */
  const openViewModal = (household) => {
    setSelectedHousehold(household);
    setPsgCode(household.psgCode || '');
    setShowViewModal(true);
  };

  const openDeleteDialog = (household) => {
    setSelectedHousehold(household);
    setShowDeleteDialog(true);
  };

  const openApproveDialog = (household) => {
    setSelectedHousehold(household);
    setShowApproveDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedHousehold) return;
    try {
      await updateDoc(doc(db, 'households', selectedHousehold.id), { status: 'approved' });
      showToast('Household approved successfully!', 'success');
      addActivityLog('approved', 'households', `Approved household "${selectedHousehold.householdNo}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      
      // Notify the submitter
      if (selectedHousehold.submittedBy) {
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            userId: selectedHousehold.submittedBy,
            role: 'resident',
            title: 'Household Approved',
            message: 'Your household profile has been approved.',
            type: 'household',
            read: false,
            createdAt: serverTimestamp(),
            link: '/household-profile',
          });
        } catch (notifErr) {
          console.error('Error sending approval notification:', notifErr);
        }
      }

      setShowApproveDialog(false);
      setSelectedHousehold(null);
    } catch (error) {
      console.error('Error approving household:', error);
      showToast('Failed to approve household.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedHousehold) return;
    try {
      await deleteDoc(doc(db, 'households', selectedHousehold.id));
      showToast('Household deleted successfully!', 'success');
      addActivityLog('deleted', 'households', `Deleted household "${selectedHousehold.householdNo}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      setShowDeleteDialog(false);
      setSelectedHousehold(null);
    } catch (error) {
      console.error('Error deleting household:', error);
      showToast('Failed to delete household.', 'error');
    }
  };

  const handleSavePsgCode = async () => {
    if (!selectedHousehold) return;
    setSavingPsg(true);
    try {
      await updateDoc(doc(db, 'households', selectedHousehold.id), { psgCode });
      // Update local state so print shows the new value
      setSelectedHousehold((prev) => prev ? { ...prev, psgCode } : prev);
      showToast('PSG Code updated.', 'success');
    } catch (error) {
      console.error('Error saving PSG code:', error);
      showToast('Failed to save PSG Code.', 'error');
    } finally {
      setSavingPsg(false);
    }
  };

  /* ================================================
     RENDER
     ================================================ */
  return (
    <div className="admin-dashboard">
      <AdminNavbar />

      <div className="admin-content">
        <div className="household-page">

          {/* ── Page Header ── */}
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Household Profiling</h1>
              <p className="admin-page-subtitle">
                View and manage submitted household profiles
              </p>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="hh-stats-grid">
            <div className="admin-card hh-stat-card">
              <IconBox variant="blue" size="sm"><Home size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{households.length}</h3>
                <p className="hh-stat-label">Total Households</p>
              </div>
            </div>
            <div className="admin-card hh-stat-card hh-stat-amber">
              <IconBox variant="amber" size="sm"><Clock size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{pendingCount}</h3>
                <p className="hh-stat-label">Pending Review</p>
              </div>
            </div>
            <div className="admin-card hh-stat-card hh-stat-green">
              <IconBox variant="green" size="sm"><CheckCircle size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{approvedCount}</h3>
                <p className="hh-stat-label">Approved</p>
              </div>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="hh-filters-section">
            <input
              type="text"
              placeholder="Search by name, street, purok..."
              className="hh-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select className="hh-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
            <select className="hh-filter-select" value={purokFilter} onChange={(e) => setPurokFilter(e.target.value)}>
              <option value="all">All Puroks</option>
              {PUROK_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="hh-loading">
              <div className="hh-loading-spinner" />
            </div>
          )}

          {/* ── Households Table ── */}
          {!loading && (
            <div className="admin-card hh-table-card">
              <h2 className="admin-card-title">Submitted Household Profiles</h2>
              <div className="hh-table-container">
                <table className="hh-table admin-table">
                  <thead>
                    <tr>
                      <th>HH No.</th>
                      <th>Submitted By</th>
                      <th>Street</th>
                      <th>Purok</th>
                      <th>Members</th>
                      <th>Date Accomplished</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseholds.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="hh-empty-state">
                            <div className="hh-empty-icon">
                              <Home size={48} strokeWidth={1.5} />
                            </div>
                            <h3>No Households Found</h3>
                            <p>
                              {searchQuery || statusFilter !== 'all' || purokFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'No households have been submitted by residents yet.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredHouseholds.map((h) => (
                        <tr key={h.id}>
                          <td><span className="hh-no-cell">{h.householdNo}</span></td>
                          <td>{submitterNames[h.submittedBy] || '...'}</td>
                          <td>{h.street || '—'}</td>
                          <td><span className="badge-pill badge-teal">{h.purok}</span></td>
                          <td>
                            <span className="badge-pill badge-blue" style={{gap: '4px'}}>
                              <Users size={14} strokeWidth={2} />
                              {h.members?.length || 0}
                            </span>
                          </td>
                          <td>{formatDate(h.dateAccomplished)}</td>
                          <td>
                            <span className={`badge-pill ${h.status === 'pending' ? 'badge-amber' : 'badge-green'}`}>
                              {h.status === 'pending' ? 'Pending' : 'Approved'}
                            </span>
                          </td>
                          <td>
                            <div className="hh-actions">
                              <button className="action-icon-btn view" title="View Details" onClick={() => openViewModal(h)}>
                                <Eye size={16} strokeWidth={1.8} />
                              </button>
                              {h.status === 'pending' && (
                                <button className="action-icon-btn approve" title="Approve" onClick={() => openApproveDialog(h)}>
                                  <CheckCircle size={16} strokeWidth={1.8} />
                                </button>
                              )}
                              <button className="action-icon-btn delete" title="Delete" onClick={() => openDeleteDialog(h)}>
                                <Trash2 size={16} strokeWidth={1.8} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
             VIEW HOUSEHOLD MODAL
             ================================================================ */}
          {showViewModal && selectedHousehold && (
            <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
              <div className="modal-dialog hh-view-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">
                    {selectedHousehold.householdNo} — {submitterNames[selectedHousehold.submittedBy] || 'Resident'}
                  </h2>
                  <button className="modal-close" onClick={() => setShowViewModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  {/* Household Info */}
                  <div className="hh-view-info-grid">
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Household No.</span>
                      <span className="hh-view-info-value">{selectedHousehold.householdNo}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Status</span>
                      <span className={`hh-status-badge ${selectedHousehold.status}`}>
                        {selectedHousehold.status === 'pending' ? 'Pending' : 'Approved'}
                      </span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Region</span>
                      <span className="hh-view-info-value">{selectedHousehold.region || 'III'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Province</span>
                      <span className="hh-view-info-value">{selectedHousehold.province || 'Zambales'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">City</span>
                      <span className="hh-view-info-value">{selectedHousehold.city || 'Olongapo'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Barangay</span>
                      <span className="hh-view-info-value">{selectedHousehold.barangay || 'Mabayuan'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Street</span>
                      <span className="hh-view-info-value">{selectedHousehold.street || '—'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Purok</span>
                      <span className="hh-view-info-value">{selectedHousehold.purok || '—'}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Date Accomplished</span>
                      <span className="hh-view-info-value">{formatDate(selectedHousehold.dateAccomplished)}</span>
                    </div>
                    <div className="hh-view-info-item">
                      <span className="hh-view-info-label">Submitted By</span>
                      <span className="hh-view-info-value">
                        {submitterNames[selectedHousehold.submittedBy] || '—'}
                        <br />
                        <small style={{ color: '#64748B', fontWeight: 400 }}>{selectedHousehold.submittedByEmail}</small>
                      </span>
                    </div>
                  </div>

                  {/* PSG Code — admin-only editable field */}
                  <div className="hh-psg-inline">
                    <label className="hh-psg-label">PSG Code</label>
                    <div className="hh-psg-row">
                      <input
                        type="text"
                        value={psgCode}
                        onChange={(e) => setPsgCode(e.target.value)}
                        placeholder="Enter PSG Code"
                        maxLength={10}
                        className="hh-psg-input"
                      />
                      <button className="hh-psg-save-btn" onClick={handleSavePsgCode} disabled={savingPsg}>
                        <Save size={14} strokeWidth={2} />
                        {savingPsg ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Members Table */}
                  <h3 className="hh-view-members-title">
                    <Users size={20} strokeWidth={1.8} />
                    Household Members ({selectedHousehold.members?.length || 0})
                  </h3>
                  <div className="hh-view-table-wrap">
                    <table className="hh-view-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Last Name</th>
                          <th>First Name</th>
                          <th>Middle</th>
                          <th>Ext.</th>
                          <th>Street</th>
                          <th>Purok</th>
                          <th>Place of Birth</th>
                          <th>Date of Birth</th>
                          <th>Gender</th>
                          <th>Civil Status</th>
                          <th>Citizenship</th>
                          <th>Occupation</th>
                          <th>Relationship</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedHousehold.members || []).map((m, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{m.lastName}</td>
                            <td>{m.firstName}</td>
                            <td>{m.middleName || '—'}</td>
                            <td>{m.extensionName || '—'}</td>
                            <td>{m.street || '—'}</td>
                            <td>{m.purok || '—'}</td>
                            <td>{m.placeOfBirth || '—'}</td>
                            <td>{formatDate(m.dateOfBirth)}</td>
                            <td>{m.gender}</td>
                            <td>{m.civilStatus}</td>
                            <td>{m.citizenship}</td>
                            <td>{m.occupation || '—'}</td>
                            <td>
                              {m.relationshipToHead}
                              {m.relationshipToHead === 'Head' && (
                                <span className="hh-head-badge" style={{ marginLeft: '0.4rem' }}>HEAD</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={handlePrint}>
                    <Printer size={16} strokeWidth={1.8} />
                    Print / Export to PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                    Close
                  </button>
                </div>
                <p className="hh-print-helper">
                  To save as PDF, select "Save as PDF" in the print dialog.
                </p>
              </div>
            </div>
          )}

          {/* Hidden Print Component */}
          <HouseholdPrintView ref={printRef} household={selectedHousehold} />

          {/* ================================================================
             APPROVE CONFIRMATION DIALOG
             ================================================================ */}
          {showApproveDialog && selectedHousehold && (
            <div className="modal-overlay" onClick={() => setShowApproveDialog(false)}>
              <div className="modal-dialog hh-delete-dialog" onClick={(e) => e.stopPropagation()}>
                <h3 className="hh-dialog-title">
                  <span className="hh-approve-icon"><CheckCircle size={28} strokeWidth={1.8} /></span>
                  Approve Household
                </h3>
                <p className="hh-dialog-message">
                  Are you sure you want to approve this household profile?
                </p>
                <p className="hh-dialog-highlight">
                  {selectedHousehold.householdNo} — {submitterNames[selectedHousehold.submittedBy] || ''}
                </p>
                <div className="hh-dialog-actions">
                  <button className="btn btn-secondary" onClick={() => setShowApproveDialog(false)}>Cancel</button>
                  <button className="btn btn-success" onClick={handleApprove}>Approve</button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
             DELETE CONFIRMATION DIALOG
             ================================================================ */}
          {showDeleteDialog && selectedHousehold && (
            <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
              <div className="modal-dialog hh-delete-dialog" onClick={(e) => e.stopPropagation()}>
                <h3 className="hh-dialog-title">
                  <span className="hh-warning-icon"><AlertTriangle size={28} strokeWidth={1.8} /></span>
                  Delete Household
                </h3>
                <p className="hh-dialog-message">
                  Are you sure you want to delete this household? This action cannot be undone.
                </p>
                <p className="hh-dialog-highlight">
                  {selectedHousehold.householdNo} — {selectedHousehold.street}, {selectedHousehold.purok}
                </p>
                <div className="hh-dialog-actions">
                  <button className="btn btn-secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HouseholdProfiling;
