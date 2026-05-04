import React, { useState, useEffect, useMemo } from 'react';
import { Plus, User, Trash2, AlertTriangle, X, Eye, Pencil, CheckCircle, Home, Megaphone, Calendar } from '../../components/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, getSecondaryAuth, getSecondaryDb } from '../../firebase';
import AdminNavbar from '../../components/AdminNavbar';
import IconBox from '../../components/IconBox';
import './ManageAdminAccounts.css';
import '../../styles/admin-common.css';
import { addActivityLog } from '../../services/activityLogService';

const PERMISSION_META = {
  residentVerification: { label: 'Resident Verification', desc: 'Verify and manage resident accounts', Icon: CheckCircle },
  householdProfiling:   { label: 'Household Profiling',   desc: 'Manage household records',           Icon: Home },
  announcements:        { label: 'Announcements',         desc: 'Post and manage announcements',       Icon: Megaphone },
  events:               { label: 'Events & Programs',     desc: 'Create and manage events',           Icon: Calendar },
};

const PERMISSION_LABELS = Object.fromEntries(
  Object.entries(PERMISSION_META).map(([k, v]) => [k, v.label])
);



const STATUS_OPTIONS = ['Active', 'Pending', 'Suspended'];
const PERM_KEYS = Object.keys(PERMISSION_LABELS);

const normalizeSubRole = (v) => (v ? String(v).trim().toLowerCase() : '');

const getRoleMeta = (subRole) => {
  const n = normalizeSubRole(subRole);
  if (!n) return { label: 'Main Admin', className: 'role-main-admin' };
  if (n === 'secretary') return { label: 'Secretary', className: 'role-secretary' };
  if (n === 'treasurer') return { label: 'Treasurer', className: 'role-treasurer' };
  if (n === 'kagawad') return { label: 'Kagawad', className: 'role-kagawad' };
  // Capitalize the first letter of each word for display, fallback to role-staff CSS
  const displayLabel = subRole.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { label: displayLabel, className: 'role-staff' };
};



const permProgressBar = (p = {}) => {
  const on = PERM_KEYS.filter(k => Boolean(p[k])).length;
  const total = PERM_KEYS.length;
  const segments = Array.from({ length: total }, (_, i) => i < on);
  
  return (
    <div className="perm-progress-wrapper" title={`${on}/${total} modules`}>
      <div className="perm-segments">
        {segments.map((isFilled, idx) => (
          <div key={idx} className={`perm-segment ${isFilled ? 'filled' : ''}`} />
        ))}
      </div>
      <span className="perm-progress-label">{on}/{total}</span>
    </div>
  );
};

const ManageAdminAccounts = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loading, setLoading] = useState(false);

  const EMPTY_CREATE = {
    fullName: '', email: '', password: '', confirmPassword: '',
    subRole: '', permissions: {},
    status: 'Active', mustChangePassword: true
  };
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [editForm, setEditForm] = useState({ subRole: '', permissions: {}, status: 'Active' });
  const [createErrors, setCreateErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const mySubRole = normalizeSubRole(userProfile?.subRole);
  const canManage = userProfile?.role === 'admin' && (!mySubRole || mySubRole === 'secretary');

  useEffect(() => { loadAdminAccounts(); }, []);

  const loadAdminAccounts = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(q);
      setAdminAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading admin accounts:', err);
      showToast('Error loading admin accounts', 'error');
    }
  };

  /* ── Audit helper ── */
  const logAudit = async (payload) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        ...payload,
        performedBy: currentUser?.uid || null,
        performedByEmail: currentUser?.email || userProfile?.email || null,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Audit log write skipped:', e.message);
    }
  };

  /* ── Prevent Enter submit ── */
  const blockEnter = (e) => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); };

  /* ── Create form helpers ── */
  const validateCreate = () => {
    const e = {};
    if (!createForm.fullName.trim()) e.fullName = 'Full name is required';
    if (!createForm.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = 'Enter a valid email';
    if (!createForm.password) e.password = 'Password is required';
    else if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(createForm.password)) e.password = 'Min 8 chars, 1 uppercase, 1 number';
    if (createForm.password !== createForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const onCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(p => ({ ...p, [name]: value }));
    if (createErrors[name]) setCreateErrors(p => ({ ...p, [name]: '' }));
  };



  const toggleCreatePerm = (k) => setCreateForm(p => ({ ...p, permissions: { ...p.permissions, [k]: !p.permissions[k] } }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) { showToast('No permission', 'error'); return; }
    if (!validateCreate()) { showToast('Fix form errors', 'error'); return; }
    try {
      setLoading(true);
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, createForm.email, createForm.password);
      await updateProfile(cred.user, { displayName: createForm.fullName });

      const payload = {
        fullName: createForm.fullName, email: createForm.email, role: 'admin',
        subRole: createForm.subRole, permissions: createForm.permissions,
        status: createForm.status, mustChangePassword: createForm.mustChangePassword,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || null,
        createdByEmail: currentUser?.email || userProfile?.email || null
      };

      const secondaryDb = getSecondaryDb(secondaryAuth);
      await setDoc(doc(secondaryDb, 'users', cred.user.uid), payload);
      await signOut(secondaryAuth);

      await logAudit({ action: 'create_admin', targetUserId: cred.user.uid, targetEmail: createForm.email, targetSubRole: createForm.subRole, changes: payload });
      showToast('Admin account created!', 'success');
      addActivityLog('created', 'adminAccounts', `Created admin account "${createForm.fullName}" (${createForm.email})`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      closeCreateModal();
      loadAdminAccounts();
    } catch (err) {
      console.error('Error creating admin:', err);
      if (err.code === 'auth/email-already-in-use') { showToast('Email already in use', 'error'); setCreateErrors(p => ({ ...p, email: 'Already in use' })); }
      else if (err.code === 'auth/weak-password') { showToast('Password too weak', 'error'); setCreateErrors(p => ({ ...p, password: 'Too weak' })); }
      else showToast('Error creating admin account', 'error');
    } finally { setLoading(false); }
  };

  const closeCreateModal = () => { setShowCreateModal(false); setCreateForm({ ...EMPTY_CREATE }); setCreateErrors({}); };

  /* ── Edit helpers ── */
  const validateEdit = () => {
    const e = {};
    if (!editForm.subRole) e.subRole = 'Required';
    if (!STATUS_OPTIONS.includes(editForm.status)) e.status = 'Invalid';
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };



  const toggleEditPerm = (k) => setEditForm(p => ({ ...p, permissions: { ...p.permissions, [k]: !p.permissions[k] } }));

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedAdmin?.id || !canManage) return;
    if (!validateEdit()) { showToast('Fix form errors', 'error'); return; }
    try {
      setLoading(true);
      const prev = { subRole: selectedAdmin.subRole, permissions: selectedAdmin.permissions, status: selectedAdmin.status };
      const next = { subRole: editForm.subRole, permissions: editForm.permissions, status: editForm.status };
      await setDoc(doc(db, 'users', selectedAdmin.id), {
        ...next, updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.uid || null,
        updatedByEmail: currentUser?.email || userProfile?.email || null
      }, { merge: true });
      await logAudit({ action: 'edit_admin', targetUserId: selectedAdmin.id, targetEmail: selectedAdmin.email, targetSubRole: editForm.subRole, changes: { prev, next } });
      showToast('Account updated!', 'success');
      addActivityLog('updated', 'adminAccounts', `Updated admin account "${selectedAdmin.fullName || selectedAdmin.email}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      setShowEditModal(false);
      loadAdminAccounts();
    } catch (err) {
      console.error('Error updating admin:', err);
      showToast('Error updating account', 'error');
    } finally { setLoading(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!selectedAdmin || !canManage) return;
    if (selectedAdmin.id === currentUser?.uid) { showToast('Cannot delete yourself', 'error'); setShowDeleteDialog(false); return; }
    try {
      setLoading(true);
      await setDoc(doc(db, 'users', selectedAdmin.id), {
        status: 'deleted', role: 'archived_admin',
        archivedAt: new Date().toISOString(),
        archivedBy: currentUser?.uid || null,
        archivedByEmail: currentUser?.email || userProfile?.email || null
      }, { merge: true });
      await logAudit({ action: 'delete_admin', targetUserId: selectedAdmin.id, targetEmail: selectedAdmin.email, targetSubRole: selectedAdmin.subRole, changes: { prev: { role: 'admin', status: selectedAdmin.status }, next: { role: 'archived_admin', status: 'deleted' } } });
      showToast('Admin account deleted!', 'success');
      addActivityLog('deleted', 'adminAccounts', `Deleted admin account "${selectedAdmin?.fullName || selectedAdmin?.email}"`, { uid: currentUser?.uid, displayName: userProfile?.fullName || currentUser?.displayName });
      setShowDeleteDialog(false);
      setSelectedAdmin(null);
      loadAdminAccounts();
    } catch (err) {
      console.error('Error deleting admin:', err);
      showToast('Error deleting account', 'error');
    } finally { setLoading(false); }
  };

  /* ── Open modals ── */
  const openView = (a) => { setSelectedAdmin(a); setShowViewModal(true); };
  const openEdit = (a) => {
    setSelectedAdmin(a);
    setEditForm({
      subRole: a.subRole || '',
      permissions: { ...(a.permissions || {}) },
      status: a.status || 'Active'
    });
    setEditErrors({});
    setShowEditModal(true);
  };
  const openDelete = (a) => { setSelectedAdmin(a); setShowDeleteDialog(true); };

  return (
    <div className="admin-dashboard">
      <AdminNavbar />
      <div className="admin-content">
        <div className="admin-container">
          <div className="admin-page-header">
            <div>
              <h1 className="admin-page-title">Manage Admin Accounts</h1>
              <p className="admin-page-subtitle">Create and manage admin user accounts</p>
            </div>
            {canManage && (
              <button className="admin-add-btn" onClick={() => setShowCreateModal(true)}>
                <span className="btn-icon"><Plus size={18} strokeWidth={1.8} /></span>
                Add Admin
              </button>
            )}
          </div>

          {/* Statistics */}
          <div className="hh-stats-grid">
            <div className="admin-card hh-stat-card">
              <IconBox variant="blue" size="sm"><User size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{adminAccounts.filter(a => a.id !== currentUser?.uid).length}</h3>
                <p className="hh-stat-label">Total Admins</p>
              </div>
            </div>
            <div className="admin-card hh-stat-card hh-stat-green">
              <IconBox variant="green" size="sm"><CheckCircle size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{adminAccounts.filter(a => a.id !== currentUser?.uid && (a.status || 'Active').toLowerCase() === 'active').length}</h3>
                <p className="hh-stat-label">Active</p>
              </div>
            </div>
            <div className="admin-card hh-stat-card hh-stat-red">
              <IconBox variant="red" size="sm"><X size={20} strokeWidth={1.8} /></IconBox>
              <div className="hh-stat-content">
                <h3 className="hh-stat-number">{adminAccounts.filter(a => a.id !== currentUser?.uid && (a.status || 'Active').toLowerCase() !== 'active').length}</h3>
                <p className="hh-stat-label">Inactive</p>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="admin-card accounts-card">
            <h2 className="admin-card-title">Admin Accounts</h2>
            <div className="table-responsive">
              <table className="accounts-table admin-table">
                <thead>
                  <tr>
                    <th>Account</th><th>Email</th><th>Role</th><th>Permissions</th><th>Status</th><th>Created</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.filter(a => a.id !== currentUser?.uid).map(a => {
                    const rm = getRoleMeta(a.subRole);
                    const isMain = rm.className === 'role-main-admin';
                    const isStaff = !isMain && a.permissions && Object.values(a.permissions).some(v => v);
                    const avatarClass = isMain ? 'avatar-purple' : isStaff ? 'avatar-teal' : 'avatar-gray';
                    const badgeClass = isMain ? 'badge-purple' : isStaff ? 'badge-teal' : 'badge-gray';
                    const statusVal = String(a.status || 'Active');
                    const statusClass = statusVal.toLowerCase() === 'active' ? 'badge-green' : 'badge-red';

                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="account-cell">
                            <div className={`avatar-circle ${avatarClass}`}>{(a.fullName || a.email || 'A').charAt(0).toUpperCase()}</div>
                            <span className="account-name">{a.fullName || 'N/A'}</span>
                          </div>
                        </td>
                        <td>{a.email}</td>
                        <td><span className={`badge-pill ${badgeClass}`}>{rm.label}</span></td>
                        <td>{permProgressBar(a.permissions)}</td>
                        <td><span className={`badge-pill ${statusClass}`}>{statusVal}</span></td>
                        <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                        <td className="actions-cell">
                          <button className="action-icon-btn view" onClick={() => openView(a)} title="View"><Eye size={16} strokeWidth={1.8} /></button>
                          {canManage && a.id !== currentUser?.uid && (
                            <>
                              <button className="action-icon-btn edit" onClick={() => openEdit(a)} title="Edit"><Pencil size={16} strokeWidth={1.8} /></button>
                              <button className="action-icon-btn delete" onClick={() => openDelete(a)} title="Delete"><Trash2 size={16} strokeWidth={1.8} /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {adminAccounts.filter(a => a.id !== currentUser?.uid).length === 0 && (
                <div className="empty-table">
                  <span className="empty-icon"><User size={48} strokeWidth={1.5} /></span>
                  <p>No admin accounts created yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Admin Account</h2>
              <button className="modal-close" onClick={closeCreateModal}><X size={20} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleCreate} onKeyDown={blockEnter} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input type="text" name="fullName" value={createForm.fullName} onChange={onCreateChange} className={`form-input ${createErrors.fullName ? 'input-error' : ''}`} placeholder="Enter full name" disabled={loading} />
                  {createErrors.fullName && <span className="field-error">{createErrors.fullName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" name="email" value={createForm.email} onChange={onCreateChange} className={`form-input ${createErrors.email ? 'input-error' : ''}`} placeholder="admin@barangay.gov" disabled={loading} />
                  {createErrors.email && <span className="field-error">{createErrors.email}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sub-Role *</label>
                  <input
                    type="text"
                    name="subRole"
                    value={createForm.subRole}
                    onChange={onCreateChange}
                    className="form-input"
                    placeholder="e.g. Treasurer, Kagawad, Staff"
                    disabled={loading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" value={createForm.status} onChange={onCreateChange} className="form-input" disabled={loading}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" name="password" value={createForm.password} onChange={onCreateChange} className={`form-input ${createErrors.password ? 'input-error' : ''}`} placeholder="Min 8 chars, 1 uppercase, 1 number" disabled={loading} />
                  {createErrors.password && <span className="field-error">{createErrors.password}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input type="password" name="confirmPassword" value={createForm.confirmPassword} onChange={onCreateChange} className={`form-input ${createErrors.confirmPassword ? 'input-error' : ''}`} placeholder="Confirm password" disabled={loading} />
                  {createErrors.confirmPassword && <span className="field-error">{createErrors.confirmPassword}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Module Permissions</label>
                <div className="permissions-grid">
                  {PERM_KEYS.map(k => {
                    const { label, desc, Icon } = PERMISSION_META[k];
                    const checked = Boolean(createForm.permissions[k]);
                    return (
                      <label key={k} className={`permission-card ${checked ? 'checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleCreatePerm(k)} disabled={loading} />
                        <span className="perm-card-icon"><Icon size={16} strokeWidth={1.8} /></span>
                        <span className="perm-card-body">
                          <span className="perm-card-label">{label}</span>
                          <span className="perm-card-desc">{desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="permission-item">
                  <input type="checkbox" checked={createForm.mustChangePassword} onChange={e => setCreateForm(p => ({ ...p, mustChangePassword: e.target.checked }))} disabled={loading} />
                  <span>Force password change on first login</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Admin Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {showViewModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Admin Account Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}><X size={20} strokeWidth={2} /></button>
            </div>
            <div className="modal-form">
              <div className="view-profile-header">
                <div className="avatar-circle avatar-lg">{(selectedAdmin.fullName || 'A').charAt(0).toUpperCase()}</div>
                <div>
                  <h3 className="view-name">{selectedAdmin.fullName || 'N/A'}</h3>
                  <p className="view-email">{selectedAdmin.email}</p>
                </div>
              </div>
              <div className="details-grid">
                <div className="detail-item"><span className="detail-label">Role</span><span className={`role-badge ${getRoleMeta(selectedAdmin.subRole).className}`}>{getRoleMeta(selectedAdmin.subRole).label}</span></div>
                <div className="detail-item"><span className="detail-label">Status</span><span className={`status-badge status-${String(selectedAdmin.status || 'Active').toLowerCase()}`}>{selectedAdmin.status || 'Active'}</span></div>
                <div className="detail-item"><span className="detail-label">Must Change Password</span><span>{selectedAdmin.mustChangePassword ? 'Yes' : 'No'}</span></div>
                <div className="detail-item"><span className="detail-label">Created At</span><span>{selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleString() : 'N/A'}</span></div>
                <div className="detail-item"><span className="detail-label">Created By</span><span>{selectedAdmin.createdByEmail || 'N/A'}</span></div>
                <div className="detail-item"><span className="detail-label">Last Updated</span><span>{selectedAdmin.updatedAt ? new Date(selectedAdmin.updatedAt).toLocaleString() : 'N/A'}</span></div>
                <div className="detail-item"><span className="detail-label">Updated By</span><span>{selectedAdmin.updatedByEmail || 'N/A'}</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div className="permissions-view">
                  {PERM_KEYS.map(k => (
                    <div key={k} className={`perm-chip ${selectedAdmin.permissions?.[k] ? 'perm-on' : 'perm-off'}`}>
                      {selectedAdmin.permissions?.[k] ? '✓' : '✗'} {PERMISSION_LABELS[k]}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedAdmin && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Admin Account</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleEdit} onKeyDown={blockEnter} className="modal-form">
              <div className="form-group">
                <label className="form-label">Email (read-only)</label>
                <input type="email" className="form-input" value={selectedAdmin.email || ''} disabled />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sub-Role *</label>
                  <input
                    type="text"
                    name="subRole"
                    value={editForm.subRole}
                    onChange={e => setEditForm(p => ({ ...p, subRole: e.target.value }))}
                    className={`form-input ${editErrors.subRole ? 'input-error' : ''}`}
                    placeholder="e.g. Treasurer, Kagawad, Staff"
                    disabled={loading}
                  />
                  {editErrors.subRole && <span className="field-error">{editErrors.subRole}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="form-input" disabled={loading}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Module Permissions</label>
                <div className="permissions-grid">
                  {PERM_KEYS.map(k => {
                    const { label, desc, Icon } = PERMISSION_META[k];
                    const checked = Boolean(editForm.permissions[k]);
                    return (
                      <label key={k} className={`permission-card ${checked ? 'checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEditPerm(k)} disabled={loading} />
                        <span className="perm-card-icon"><Icon size={16} strokeWidth={1.8} /></span>
                        <span className="perm-card-body">
                          <span className="perm-card-label">{label}</span>
                          <span className="perm-card-desc">{desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Dialog ── */}
      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title"><span className="warning-icon"><AlertTriangle size={20} strokeWidth={1.8} /></span> Confirm Deletion</h3>
            <p className="dialog-message">Are you sure you want to delete the admin account for <strong>{selectedAdmin?.fullName}</strong>? This action cannot be undone.</p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteDialog(false)} disabled={loading}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdminAccounts;
