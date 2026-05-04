import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Users, ClipboardList, Send, Clock, CheckCircle } from '../components/Icons';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import PageLoader from '../components/PageLoader';
import './HouseholdProfile.css';
import './Dashboard.css';

/* ── Constants ── */
const PUROK_OPTIONS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];
const RELATIONSHIP_OPTIONS = ['Head', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandchild', 'Others'];
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated'];
const GENDER_OPTIONS = ['Male', 'Female'];
const NAME_REGEX = /^[a-zA-Z\s.\-']+$/;

const EMPTY_MEMBER = {
  lastName: '', firstName: '', middleName: '', extensionName: '',
  placeOfBirth: '', dateOfBirth: '', gender: '', civilStatus: '',
  citizenship: 'Filipino', occupation: '', relationshipToHead: '',
};

/* ── Helpers ── */
const formatDate = (d) => {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const generateHouseholdNo = async () => {
  const counterRef = doc(db, 'metadata', 'householdCounter');
  let newNumber = '';
  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const lastCount = counterDoc.exists() ? counterDoc.data().lastCount : 0;
    const newCount = lastCount + 1;
    newNumber = `HH-${String(newCount).padStart(4, '0')}`;
    transaction.set(counterRef, { lastCount: newCount });
  });
  return newNumber;
};

/* ================================================
   MAIN COMPONENT
   ================================================ */
const HouseholdProfile = () => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state (only used in CASE 1: no household yet)
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [purok, setPurok] = useState('');
  const [dateAccomplished, setDateAccomplished] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ ...EMPTY_MEMBER });
  const [errors, setErrors] = useState({});
  const [memberErrors, setMemberErrors] = useState({});

  /* ── Auto-fill Purok ── */
  useEffect(() => {
    if (userProfile?.purok) {
      setPurok(userProfile.purok);
    }
  }, [userProfile]);

  /* ── Listen for existing household submission ── */
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'households'), where('submittedBy', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setHousehold({ id: docData.id, ...docData.data() });
      } else {
        setHousehold(null);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error listening to household:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  /* ── Member validation ── */
  const validateMember = () => {
    const errs = {};
    if (!memberForm.lastName.trim()) {
      errs.lastName = 'Last name is required.';
    } else if (!NAME_REGEX.test(memberForm.lastName)) {
      errs.lastName = 'Name can only contain letters, spaces, periods, hyphens, and apostrophes.';
    }
    if (!memberForm.firstName.trim()) {
      errs.firstName = 'First name is required.';
    } else if (!NAME_REGEX.test(memberForm.firstName)) {
      errs.firstName = 'Name can only contain letters, spaces, periods, hyphens, and apostrophes.';
    }
    if (memberForm.middleName.trim() && !NAME_REGEX.test(memberForm.middleName)) {
      errs.middleName = 'Name can only contain letters, spaces, periods, hyphens, and apostrophes.';
    }
    if (!memberForm.dateOfBirth) errs.dateOfBirth = 'Date of birth is required.';
    if (!memberForm.placeOfBirth.trim()) errs.placeOfBirth = 'Place of birth is required.';
    if (!memberForm.gender) errs.gender = 'Gender is required.';
    if (!memberForm.civilStatus) errs.civilStatus = 'Civil status is required.';
    if (!memberForm.citizenship.trim()) errs.citizenship = 'Citizenship is required.';
    if (!memberForm.relationshipToHead) errs.relationshipToHead = 'Relationship is required.';
    setMemberErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleMemberChange = (e) => {
    const { name, value } = e.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
    if (memberErrors[name]) setMemberErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleAddMember = () => {
    if (!validateMember()) {
      showToast('Please fill in all required member fields.', 'error');
      return;
    }
    setMembers((prev) => [...prev, { ...memberForm }]);
    // Reset form but keep default citizenship
    setMemberForm({ ...EMPTY_MEMBER });
    setMemberErrors({});
    showToast('Member added to list.', 'success');
  };

  const handleRemoveMember = (index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Submit Household ── */
  const handleSubmit = async () => {
    // Validate household fields
    const errs = {};
    if (!houseNo.trim()) errs.houseNo = 'House No. is required.';
    if (!street.trim()) errs.street = 'Street is required.';
    if (!purok) errs.purok = 'Purok is required.';
    if (!dateAccomplished) errs.dateAccomplished = 'Date is required.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Validate members
    if (members.length === 0) {
      showToast('Please add at least one household member.', 'error');
      return;
    }
    const hasHead = members.some((m) => m.relationshipToHead === 'Head');
    if (!hasHead) {
      showToast('At least one member must be the "Head" of household.', 'error');
      return;
    }

    setSaving(true);
    try {
      const householdNo = await generateHouseholdNo();
      await addDoc(collection(db, 'households'), {
        householdNo,
        submittedBy: currentUser.uid,
        submittedByEmail: currentUser.email,
        status: 'pending',
        region: 'III',
        province: 'Zambales',
        city: 'Olongapo',
        barangay: 'Mabayuan',
        psgCode: '',
        houseNo,
        street,
        purok,
        dateAccomplished,
        members,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Notify all admins about the new household submission
      try {
        const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        if (!adminsSnap.empty) {
          const batch = writeBatch(db);
          adminsSnap.docs.forEach((adminDoc) => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: adminDoc.id,
              role: 'admin',
              title: 'New Household Submission',
              message: `${userProfile?.fullName || currentUser.email} submitted a household profile.`,
              type: 'household',
              read: false,
              createdAt: serverTimestamp(),
              link: '/admin/households',
            });
          });
          await batch.commit();
        }
      } catch (notifErr) {
        console.error('Error sending household submission notification to admins:', notifErr);
      }

      showToast('Household profile submitted successfully!', 'success');
    } catch (error) {
      console.error('Error submitting household:', error);
      showToast('Failed to submit. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ================================================
     RENDER
     ================================================ */
  return (
    <PageLoader isLoading={loading} loadingMessage="Loading household profile...">
      <div className="dashboard-wrapper">
        <div className="dashboard">
          <div className="dash-content-header">
            <div className="dash-header-left">
              <h1 className="dash-title">Household Profile</h1>
              <p className="dash-subtitle">
                {household
                  ? 'View your submitted household profile information.'
                  : 'Submit your household profile for Barangay Mabayuan.'}
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════
             CASE 2: Already submitted — read-only
             ════════════════════════════════════════ */}
          {household && (
            <div className="hp-submitted-card">
              {/* Status Banner */}
              <div className={`hp-status-banner ${household.status}`}>
                {household.status === 'pending' ? (
                  <><Clock size={20} strokeWidth={1.8} /> Your household profile has been submitted and is pending review by the barangay admin.</>
                ) : (
                  <><CheckCircle size={20} strokeWidth={1.8} /> Your household profile has been approved by the barangay admin.</>
                )}
              </div>

              {/* Household Info */}
              <div className="hp-info-grid">
                <div className="hp-info-item">
                  <span className="hp-info-label">Household No.</span>
                  <span className="hp-info-value">{household.householdNo}</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Status</span>
                  <span className={`hp-status-badge ${household.status}`}>
                    {household.status === 'pending' ? 'Pending Review' : 'Approved'}
                  </span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Region</span>
                  <span className="hp-info-value">III</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Province</span>
                  <span className="hp-info-value">Zambales</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">City</span>
                  <span className="hp-info-value">Olongapo</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Barangay</span>
                  <span className="hp-info-value">Mabayuan</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">House No.</span>
                  <span className="hp-info-value">{household.houseNo || '—'}</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Street</span>
                  <span className="hp-info-value">{household.street || '—'}</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Purok</span>
                  <span className="hp-info-value">{household.purok || '—'}</span>
                </div>
                <div className="hp-info-item">
                  <span className="hp-info-label">Date Accomplished</span>
                  <span className="hp-info-value">{formatDate(household.dateAccomplished)}</span>
                </div>
              </div>

              {/* Members Table */}
              <h3 className="hp-members-title">
                <Users size={20} strokeWidth={1.8} />
                Household Members ({household.members?.length || 0})
              </h3>
              <div className="hp-members-table-wrap">
                <table className="hp-members-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Last Name</th>
                      <th>First Name</th>
                      <th>Middle</th>
                      <th>Gender</th>
                      <th>Civil Status</th>
                      <th>Occupation</th>
                      <th>Relationship</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(household.members || []).map((m, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{m.lastName}</td>
                        <td>{m.firstName}</td>
                        <td>{m.middleName || '—'}</td>
                        <td>{m.gender}</td>
                        <td>{m.civilStatus}</td>
                        <td>{m.occupation || '—'}</td>
                        <td>
                          {m.relationshipToHead}
                          {m.relationshipToHead === 'Head' && <span className="hp-head-badge">HEAD</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
             CASE 1: No household yet — show form
             ════════════════════════════════════════ */}
          {!household && (
            <>
              {/* Section 1: Household Location Info */}
              <div className="hp-form-card">
                <h2 className="hp-form-title">
                  <ClipboardList size={22} strokeWidth={1.8} />
                  Household Location Information
                </h2>
                <p className="hp-form-subtitle">Fill in the household address details. Pre-filled fields are based on Barangay Mabayuan's official records.</p>

                {/* Read-only fields */}
                <div className="hp-readonly-grid">
                  <div className="hp-readonly-item">
                    <span className="hp-readonly-label">Region</span>
                    <span className="hp-readonly-value">III</span>
                  </div>
                  <div className="hp-readonly-item">
                    <span className="hp-readonly-label">Province</span>
                    <span className="hp-readonly-value">Zambales</span>
                  </div>
                  <div className="hp-readonly-item">
                    <span className="hp-readonly-label">City</span>
                    <span className="hp-readonly-value">Olongapo</span>
                  </div>
                  <div className="hp-readonly-item">
                    <span className="hp-readonly-label">Barangay</span>
                    <span className="hp-readonly-value">Mabayuan</span>
                  </div>
                </div>

                {/* Editable fields */}
                <div className="hp-form-row">
                  <div className="hp-form-group">
                    <label className="hp-form-label">House No. *</label>
                    <input
                      type="text"
                      className={`hp-form-input ${errors.houseNo ? 'input-error' : ''}`}
                      value={houseNo}
                      onChange={(e) => { setHouseNo(e.target.value); if (errors.houseNo) setErrors((p) => ({ ...p, houseNo: '' })); }}
                      placeholder="Enter house number"
                    />
                    {errors.houseNo && <span className="hp-field-error">{errors.houseNo}</span>}
                  </div>
                  <div className="hp-form-group">
                    <label className="hp-form-label">Street *</label>
                    <input
                      type="text"
                      className={`hp-form-input ${errors.street ? 'input-error' : ''}`}
                      value={street}
                      onChange={(e) => { setStreet(e.target.value); if (errors.street) setErrors((p) => ({ ...p, street: '' })); }}
                      placeholder="Enter street"
                    />
                    {errors.street && <span className="hp-field-error">{errors.street}</span>}
                  </div>
                  <div className="hp-form-group">
                    <label className="hp-form-label">Purok</label>
                    <input
                      type="text"
                      className="hp-form-input hp-disabled-input"
                      value={purok || 'Loading...'}
                      disabled
                      style={{ cursor: 'not-allowed', backgroundColor: '#f3f4f6', color: '#6b7280' }}
                    />
                    {errors.purok && <span className="hp-field-error">{errors.purok}</span>}
                  </div>
                </div>
                <div className="hp-form-group">
                  <label className="hp-form-label">Date Accomplished *</label>
                  <input
                    type="date"
                    className={`hp-form-input ${errors.dateAccomplished ? 'input-error' : ''}`}
                    value={dateAccomplished}
                    onChange={(e) => { setDateAccomplished(e.target.value); if (errors.dateAccomplished) setErrors((p) => ({ ...p, dateAccomplished: '' })); }}
                  />
                  {errors.dateAccomplished && <span className="hp-field-error">{errors.dateAccomplished}</span>}
                </div>
              </div>

              {/* Section 2: Household Members */}
              <div className="hp-form-card">
                <div className="hp-section-title">
                  <Users size={22} strokeWidth={1.8} />
                  Household Members
                </div>
                <p className="hp-section-subtitle">Add all members of your household. At least one "Head" member is required.</p>

                {/* Member Form */}
                <div className="hp-member-form">
                  <div className="hp-form-row-3">
                    <div className="hp-form-group">
                      <label className="hp-form-label">Last Name *</label>
                      <input type="text" name="lastName" className={`hp-form-input ${memberErrors.lastName ? 'input-error' : ''}`} value={memberForm.lastName} onChange={handleMemberChange} placeholder="Last Name" />
                      {memberErrors.lastName && <span className="hp-field-error">{memberErrors.lastName}</span>}
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">First Name *</label>
                      <input type="text" name="firstName" className={`hp-form-input ${memberErrors.firstName ? 'input-error' : ''}`} value={memberForm.firstName} onChange={handleMemberChange} placeholder="First Name" />
                      {memberErrors.firstName && <span className="hp-field-error">{memberErrors.firstName}</span>}
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">Middle Name</label>
                      <input type="text" name="middleName" className={`hp-form-input ${memberErrors.middleName ? 'input-error' : ''}`} value={memberForm.middleName} onChange={handleMemberChange} placeholder="Middle Name" />
                      {memberErrors.middleName && <span className="hp-field-error">{memberErrors.middleName}</span>}
                    </div>
                  </div>

                  <div className="hp-form-row-3">
                    <div className="hp-form-group">
                      <label className="hp-form-label">Extension Name</label>
                      <input type="text" name="extensionName" className="hp-form-input" value={memberForm.extensionName} onChange={handleMemberChange} placeholder="Jr., Sr., III" />
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">Place of Birth *</label>
                      <input type="text" name="placeOfBirth" className={`hp-form-input ${memberErrors.placeOfBirth ? 'input-error' : ''}`} value={memberForm.placeOfBirth} onChange={handleMemberChange} placeholder="Place of Birth" />
                      {memberErrors.placeOfBirth && <span className="hp-field-error">{memberErrors.placeOfBirth}</span>}
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">Date of Birth *</label>
                      <input type="date" name="dateOfBirth" className={`hp-form-input ${memberErrors.dateOfBirth ? 'input-error' : ''}`} value={memberForm.dateOfBirth} onChange={handleMemberChange} />
                      {memberErrors.dateOfBirth && <span className="hp-field-error">{memberErrors.dateOfBirth}</span>}
                    </div>
                  </div>

                  <div className="hp-form-row-3">
                    <div className="hp-form-group">
                      <label className="hp-form-label">Gender *</label>
                      <select name="gender" className={`hp-form-select ${memberErrors.gender ? 'input-error' : ''}`} value={memberForm.gender} onChange={handleMemberChange}>
                        <option value="">Select Gender</option>
                        {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {memberErrors.gender && <span className="hp-field-error">{memberErrors.gender}</span>}
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">Civil Status *</label>
                      <select name="civilStatus" className={`hp-form-select ${memberErrors.civilStatus ? 'input-error' : ''}`} value={memberForm.civilStatus} onChange={handleMemberChange}>
                        <option value="">Select Status</option>
                        {CIVIL_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {memberErrors.civilStatus && <span className="hp-field-error">{memberErrors.civilStatus}</span>}
                    </div>
                    <div className="hp-form-group">
                      <label className="hp-form-label">Citizenship *</label>
                      <input type="text" name="citizenship" className={`hp-form-input ${memberErrors.citizenship ? 'input-error' : ''}`} value={memberForm.citizenship} onChange={handleMemberChange} placeholder="Citizenship" />
                      {memberErrors.citizenship && <span className="hp-field-error">{memberErrors.citizenship}</span>}
                    </div>
                  </div>

                  <div className="hp-form-row-3">
                    <div className="hp-form-group">
                      <label className="hp-form-label">Occupation</label>
                      <input type="text" name="occupation" className="hp-form-input" value={memberForm.occupation} onChange={handleMemberChange} placeholder="Occupation" />
                    </div>
                    <div className="hp-form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="hp-form-label">Relationship to Head *</label>
                      <select name="relationshipToHead" className={`hp-form-select ${memberErrors.relationshipToHead ? 'input-error' : ''}`} value={memberForm.relationshipToHead} onChange={handleMemberChange}>
                        <option value="">Select Relationship</option>
                        {RELATIONSHIP_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {memberErrors.relationshipToHead && <span className="hp-field-error">{memberErrors.relationshipToHead}</span>}
                    </div>
                  </div>

                  <button type="button" className="hp-add-member-btn" onClick={handleAddMember}>
                    <Plus size={18} strokeWidth={1.8} />
                    Add Member
                  </button>
                </div>

                {/* Members Preview */}
                {members.length > 0 ? (
                  <>
                    <div className="hp-preview-header">
                      <h4 className="hp-preview-title">Members Added</h4>
                      <span className="hp-preview-count">{members.length} member(s)</span>
                    </div>
                    <div className="hp-preview-table-wrap">
                      <table className="hp-preview-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Last Name</th>
                            <th>First Name</th>
                            <th>Middle</th>
                            <th>Gender</th>
                            <th>Relationship</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{m.lastName}</td>
                              <td>{m.firstName}</td>
                              <td>{m.middleName || '—'}</td>
                              <td>{m.gender}</td>
                              <td>
                                {m.relationshipToHead}
                                {m.relationshipToHead === 'Head' && <span className="hp-head-badge">HEAD</span>}
                              </td>
                              <td>
                                <button type="button" className="hp-remove-btn" onClick={() => handleRemoveMember(i)} title="Remove">
                                  <X size={16} strokeWidth={2} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="hp-no-members">
                    <ClipboardList size={40} strokeWidth={1.5} style={{ opacity: 0.25 }} />
                    <p>No members added yet. Add at least one member above.</p>
                    <p className="hp-required-notice">⚠ At least one "Head" member is required.</p>
                  </div>
                )}

                <button
                  className="hp-submit-btn"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    'Submitting...'
                  ) : (
                    <><Send size={18} strokeWidth={1.8} /> Submit Household Profile</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLoader>
  );
};

export default HouseholdProfile;
