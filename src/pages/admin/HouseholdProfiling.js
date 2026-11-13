import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Eye, Trash2, Users, Home, Clock, CheckCircle,
  AlertTriangle, Printer, Search, Save, RefreshCw, Table, Filter,
} from '../../components/Icons';
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
  const [purokFilter, setPurokFilter] = useState('all');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('all');
  const [tablePurokFilter, setTablePurokFilter] = useState('all');

  // Submitter names cache: uid -> fullName
  const [submitterNames, setSubmitterNames] = useState({});
  const fetchedUidsRef = useRef(new Set());

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState(null);

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
        if (h.submittedByName) {
          setSubmitterNames((prev) => ({ ...prev, [h.submittedBy]: h.submittedByName }));
          fetchedUidsRef.current.add(h.submittedBy);
        } else if (h.submittedBy && !fetchedUidsRef.current.has(h.submittedBy)) {
          // Fallback to Head of Household or email if user lookup fails
          const head = h.members?.find(m => m.relationshipToHead === 'Head');
          const fallback = head ? `${head.firstName} ${head.lastName}` : h.submittedByEmail;
          fetchedUidsRef.current.add(h.submittedBy);
          fetchSubmitterName(h.submittedBy, fallback);
        }
      });
    }, (err) => {
      console.error('Error subscribing to households:', err);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubmitterName = async (uid, fallbackName) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setSubmitterNames((prev) => ({ ...prev, [uid]: userDoc.data().fullName || userDoc.data().email || fallbackName || 'Unknown' }));
      } else {
        setSubmitterNames((prev) => ({ ...prev, [uid]: fallbackName || 'Unknown User' }));
      }
    } catch {
      setSubmitterNames((prev) => ({ ...prev, [uid]: fallbackName || 'Unknown User' }));
    }
  };

  /* ── Derived data ── */
  const totalMembers = households.reduce((sum, h) => sum + (h.members?.length || 0), 0);
  const updatedCount = households.filter((h) => h.isUpdated === true).length;

  /* ── Special Categories Analytics & Purok Breakdown ── */
  const specialCategoriesStats = useMemo(() => {
    let totalPWD = 0;
    let totalSeniors = 0;
    let totalSoloParents = 0;
    let totalPatients = 0;
    let totalMembersCount = 0;

    const purokBreakdown = {};
    PUROK_OPTIONS.forEach((p) => {
      purokBreakdown[p] = { pwd: 0, senior: 0, soloParent: 0, patient: 0, total: 0, members: 0 };
    });

    households.forEach((h) => {
      const rawPurok = h.purok || 'Unknown';
      const pKey = PUROK_OPTIONS.includes(rawPurok) ? rawPurok : null;

      (h.members || []).forEach((m) => {
        totalMembersCount++;
        if (pKey) purokBreakdown[pKey].members++;

        let memberSpecialCount = 0;
        if (m.isPWD) {
          totalPWD++;
          if (pKey) purokBreakdown[pKey].pwd++;
          memberSpecialCount++;
        }
        if (m.isSeniorCitizen) {
          totalSeniors++;
          if (pKey) purokBreakdown[pKey].senior++;
          memberSpecialCount++;
        }
        if (m.isSoloParent) {
          totalSoloParents++;
          if (pKey) purokBreakdown[pKey].soloParent++;
          memberSpecialCount++;
        }
        if (m.isPatient) {
          totalPatients++;
          if (pKey) purokBreakdown[pKey].patient++;
          memberSpecialCount++;
        }
        if (memberSpecialCount > 0 && pKey) {
          purokBreakdown[pKey].total += memberSpecialCount;
        }
      });
    });

    return {
      totalPWD,
      totalSeniors,
      totalSoloParents,
      totalPatients,
      totalAllCategories: totalPWD + totalSeniors + totalSoloParents + totalPatients,
      totalMembersCount,
      purokBreakdown,
    };
  }, [households]);

  const filteredHouseholds = households.filter((h) => {
    const name = submitterNames[h.submittedBy] || '';
    const matchesSearch =
      searchQuery === '' ||
      (h.householdNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.street || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.purok || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPurok = purokFilter === 'all' || h.purok === purokFilter;
    return matchesSearch && matchesPurok;
  });

  /* ── Actions ── */
  const openViewModal = async (h) => {
    setSelectedHousehold(h);
    setShowViewModal(true);
    // Clear the "Updated" badge when admin views the profile
    if (h.isUpdated) {
      try {
        await updateDoc(doc(db, 'households', h.id), { isUpdated: false });
      } catch (err) {
        console.error('Error clearing isUpdated flag:', err);
      }
    }
  };

  const openDeleteDialog = (household) => {
    setSelectedHousehold(household);
    setShowDeleteDialog(true);
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

          {/* ── 3 Stat Cards (Special Categories Demographics Style - Static / Informational) ── */}
          <div className="sc-kpi-grid">
            <div className="sc-kpi-card sc-kpi-blue sc-kpi-static">
              <div className="sc-kpi-top">
                <div className="sc-kpi-icon sc-kpi-icon-blue">
                  <Home size={20} strokeWidth={2} />
                </div>
                <span className="sc-kpi-badge">Households</span>
              </div>
              <div className="sc-kpi-num">{households.length}</div>
              <div className="sc-kpi-title">Total Households</div>
              <div className="sc-kpi-pct">Registered family units</div>
            </div>

            <div className="sc-kpi-card sc-kpi-teal sc-kpi-static">
              <div className="sc-kpi-top">
                <div className="sc-kpi-icon sc-kpi-icon-teal">
                  <Users size={20} strokeWidth={2} />
                </div>
                <span className="sc-kpi-badge">Population</span>
              </div>
              <div className="sc-kpi-num">{totalMembers}</div>
              <div className="sc-kpi-title">Total Profiled Members</div>
              <div className="sc-kpi-pct">
                Avg {households.length > 0 ? (totalMembers / households.length).toFixed(1) : 0} members / household
              </div>
            </div>

            <div className="sc-kpi-card sc-kpi-amber sc-kpi-static">
              <div className="sc-kpi-top">
                <div className="sc-kpi-icon sc-kpi-icon-amber">
                  <RefreshCw size={20} strokeWidth={2} />
                </div>
                <span className="sc-kpi-badge">Updated</span>
              </div>
              <div className="sc-kpi-num">{updatedCount}</div>
              <div className="sc-kpi-title">Recently Updated</div>
              <div className="sc-kpi-pct">
                {households.length > 0
                  ? `${((updatedCount / households.length) * 100).toFixed(0)}% of household records`
                  : 'All records synced'}
              </div>
            </div>
          </div>

          {/* ── Purok Breakdown Data Table ── */}
          <div className="sc-table-wrap hh-purok-table-wrap">
            <div className="sc-table-header">
              <div className="sc-table-title-group">
                <Table size={16} strokeWidth={2} />
                <span className="sc-table-title">Purok Breakdown Data Table</span>
              </div>
              <div className="sc-table-controls">
                <div className="section-filter-item">
                  <span className="section-filter-label"><Filter size={13} strokeWidth={2} /> Category:</span>
                  <select
                    className="section-filter-select"
                    value={tableCategoryFilter}
                    onChange={(e) => setTableCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="pwd">PWD (Persons with Disability)</option>
                    <option value="senior">Senior Citizens (60+)</option>
                    <option value="soloParent">Solo Parents</option>
                    <option value="patient">Patients (Chronic Illness)</option>
                  </select>
                </div>
                <div className="section-filter-item">
                  <span className="section-filter-label">Purok:</span>
                  <select
                    className="section-filter-select"
                    value={tablePurokFilter}
                    onChange={(e) => setTablePurokFilter(e.target.value)}
                  >
                    <option value="all">All Puroks</option>
                    {PUROK_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="sc-table-responsive">
              <table className="sc-data-table">
                <thead>
                  <tr>
                    <th>Purok</th>
                    <th
                      className={`th-clickable ${tableCategoryFilter === 'pwd' ? 'th-highlight' : ''}`}
                      onClick={() => setTableCategoryFilter((prev) => (prev === 'pwd' ? 'all' : 'pwd'))}
                      title="Click to highlight PWD"
                    >
                      PWD
                    </th>
                    <th
                      className={`th-clickable ${tableCategoryFilter === 'senior' ? 'th-highlight' : ''}`}
                      onClick={() => setTableCategoryFilter((prev) => (prev === 'senior' ? 'all' : 'senior'))}
                      title="Click to highlight Senior Citizens"
                    >
                      Senior Citizens (60+)
                    </th>
                    <th
                      className={`th-clickable ${tableCategoryFilter === 'soloParent' ? 'th-highlight' : ''}`}
                      onClick={() => setTableCategoryFilter((prev) => (prev === 'soloParent' ? 'all' : 'soloParent'))}
                      title="Click to highlight Solo Parents"
                    >
                      Solo Parents
                    </th>
                    <th
                      className={`th-clickable ${tableCategoryFilter === 'patient' ? 'th-highlight' : ''}`}
                      onClick={() => setTableCategoryFilter((prev) => (prev === 'patient' ? 'all' : 'patient'))}
                      title="Click to highlight Chronic Patients"
                    >
                      Chronic Patients
                    </th>
                    <th>Total Special Needs</th>
                    <th>Profiled Population</th>
                  </tr>
                </thead>
                <tbody>
                  {(tablePurokFilter === 'all' ? PUROK_OPTIONS : [tablePurokFilter]).map((p) => {
                    const d = specialCategoriesStats.purokBreakdown[p] || { pwd: 0, senior: 0, soloParent: 0, patient: 0, members: 0 };
                    const rowTotal = d.pwd + d.senior + d.soloParent + d.patient;
                    return (
                      <tr key={p}>
                        <td className="td-purok-name">
                          <span className="sc-purok-badge">{p}</span>
                        </td>
                        <td className={tableCategoryFilter === 'pwd' ? 'td-highlight' : ''}>
                          <span className="sc-cell-num">{d.pwd}</span>
                        </td>
                        <td className={tableCategoryFilter === 'senior' ? 'td-highlight' : ''}>
                          <span className="sc-cell-num">{d.senior}</span>
                        </td>
                        <td className={tableCategoryFilter === 'soloParent' ? 'td-highlight' : ''}>
                          <span className="sc-cell-num">{d.soloParent}</span>
                        </td>
                        <td className={tableCategoryFilter === 'patient' ? 'td-highlight' : ''}>
                          <span className="sc-cell-num">{d.patient}</span>
                        </td>
                        <td>
                          <span className="sc-cell-total">{rowTotal}</span>
                        </td>
                        <td className="td-muted">{d.members}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="sc-tfoot-row">
                    <td>TOTAL</td>
                    <td className={tableCategoryFilter === 'pwd' ? 'td-highlight' : ''}>
                      {specialCategoriesStats.totalPWD}
                    </td>
                    <td className={tableCategoryFilter === 'senior' ? 'td-highlight' : ''}>
                      {specialCategoriesStats.totalSeniors}
                    </td>
                    <td className={tableCategoryFilter === 'soloParent' ? 'td-highlight' : ''}>
                      {specialCategoriesStats.totalSoloParents}
                    </td>
                    <td className={tableCategoryFilter === 'patient' ? 'td-highlight' : ''}>
                      {specialCategoriesStats.totalPatients}
                    </td>
                    <td className="td-grand-total">{specialCategoriesStats.totalAllCategories}</td>
                    <td>{specialCategoriesStats.totalMembersCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
              <div className="table-card-header">
                <div className="table-card-title-group">
                  <h2 className="table-card-title">Submitted Household Profiles</h2>
                  <span className="table-card-count">
                    {filteredHouseholds.length} {filteredHouseholds.length === 1 ? 'profile' : 'profiles'}
                  </span>
                </div>

                <div className="hh-card-controls">
                  <div className="hh-search-wrap">
                    <Search size={14} className="hh-search-icon" />
                    <input
                      type="text"
                      placeholder="Search name, street, purok..."
                      className="hh-search-input-refined"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="hh-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="ann-date-filter-wrap">
                    <span className="ann-date-filter-label">Purok:</span>
                    <select
                      className="ann-date-filter-select"
                      value={purokFilter}
                      onChange={(e) => setPurokFilter(e.target.value)}
                    >
                      <option value="all">All Puroks</option>
                      {PUROK_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHouseholds.length === 0 ? (
                      <tr>
                        <td colSpan="7">
                          <div className="hh-empty-state">
                            <div className="hh-empty-icon">
                              <Home size={48} strokeWidth={1.5} />
                            </div>
                            <h3>No Households Found</h3>
                            <p>
                              {searchQuery || purokFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria.'
                                : 'No households have been submitted by residents yet.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredHouseholds.map((h) => (
                        <tr key={h.id}>
                          <td>
                            <span className="hh-no-cell">{h.householdNo}</span>
                            {h.isUpdated && <span className="hh-updated-badge">Updated</span>}
                          </td>
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
                            <div className="hh-actions">
                              <button className="action-icon-btn view" title="View Details" onClick={() => openViewModal(h)}>
                                <Eye size={16} strokeWidth={1.8} />
                              </button>
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
                          <th>Special Categories</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedHousehold.members || []).map((m, i) => {
                          const tags = [
                            m.isPWD && 'PWD',
                            m.isSeniorCitizen && 'Senior Citizen',
                            m.isSoloParent && 'Solo Parent',
                            m.isPatient && 'Patient (Chronic)',
                          ].filter(Boolean);
                          return (
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
                              <td>
                                {tags.length > 0 ? (
                                  <span className="hh-sc-tags">
                                    {tags.map((t) => (
                                      <span key={t} className="hh-sc-tag">{t}</span>
                                    ))}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94A3B8' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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
