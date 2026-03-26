import React, { useState, useEffect } from 'react';
import { Plus, User, Trash2, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { archiveRecord } from '../../services/archiveService';
import AdminNavbar from '../../components/AdminNavbar';
import './ManageAdminAccounts.css';
import '../../styles/admin-common.css';

const ManageAdminAccounts = () => {
  const { showToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadAdminAccounts();
  }, []);

  const loadAdminAccounts = async () => {
    try {
      const adminsRef = collection(db, 'users');
      const q = query(adminsRef, where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const admins = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdminAccounts(admins);
    } catch (error) {
      console.error('Error loading admin accounts:', error);
      showToast('Error loading admin accounts', 'error');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    try {
      setLoading(true);

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update Firebase Auth profile with the name
      await updateProfile(userCredential.user, {
        displayName: formData.fullName
      });

      // Create user profile in Firestore with admin role
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      showToast('Admin account created successfully!', 'success');
      closeModal();
      loadAdminAccounts();
    } catch (error) {
      console.error('Error creating admin account:', error);
      if (error.code === 'auth/email-already-in-use') {
        showToast('This email is already in use', 'error');
        setFormErrors(prev => ({ ...prev, email: 'This email is already in use' }));
      } else if (error.code === 'auth/weak-password') {
        showToast('Password is too weak', 'error');
        setFormErrors(prev => ({ ...prev, password: 'Password is too weak' }));
      } else {
        showToast('Error creating admin account', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setLoading(true);

      const archivedBy = currentUser?.uid || null;
      const archivedByEmail = currentUser?.email || userProfile?.email || null;
      
      // Archive the user record before deleting
      await archiveRecord('users', selectedAdmin.id, archivedBy, archivedByEmail);

      // Delete user from Firestore
      await deleteDoc(doc(db, 'users', selectedAdmin.id));

      showToast('Admin account deleted successfully!', 'success');
      setShowDeleteDialog(false);
      setSelectedAdmin(null);
      loadAdminAccounts();
    } catch (error) {
      console.error('Error deleting admin account:', error);
      showToast('Error deleting admin account. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
  };

  const openDeleteDialog = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteDialog(true);
  };

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
            <button className="admin-add-btn" onClick={() => setShowModal(true)}>
              <span className="btn-icon"><Plus size={18} strokeWidth={1.8} /></span>
              Create Admin Account
            </button>
          </div>

          {/* Admin Accounts Table */}
          <div className="accounts-card">
            <h2 className="card-title">Admin Accounts</h2>
            <div className="table-responsive">
              <table className="accounts-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminAccounts.map(admin => (
                    <tr key={admin.id}>
                      <td>{admin.fullName}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span className="status-badge status-active">
                          {admin.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        {admin.createdAt
                          ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-action btn-delete"
                          onClick={() => openDeleteDialog(admin)}
                          title="Delete admin account"
                        >
                          <Trash2 size={18} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminAccounts.length === 0 && (
                <div className="empty-table">
                  <span className="empty-icon"><User size={48} strokeWidth={1.5} /></span>
                  <p>No admin accounts created yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Admin Account</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={20} strokeWidth={2} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`form-input ${formErrors.fullName ? 'input-error' : ''}`}
                  placeholder="Enter full name"
                  disabled={loading}
                />
                {formErrors.fullName && (
                  <span className="field-error">{formErrors.fullName}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${formErrors.email ? 'input-error' : ''}`}
                  placeholder="admin@barangay.gov"
                  disabled={loading}
                />
                {formErrors.email && (
                  <span className="field-error">{formErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                  placeholder="Create a password (min. 6 characters)"
                  disabled={loading}
                  minLength={6}
                />
                {formErrors.password && (
                  <span className="field-error">{formErrors.password}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${formErrors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                  disabled={loading}
                  minLength={6}
                />
                {formErrors.confirmPassword && (
                  <span className="field-error">{formErrors.confirmPassword}</span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="delete-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">
              <span className="warning-icon"><AlertTriangle size={20} strokeWidth={1.8} /></span>
              Confirm Deletion
            </h3>
            <p className="dialog-message">
              Are you sure you want to delete the admin account for <strong>{selectedAdmin?.fullName}</strong>? This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteAdmin}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdminAccounts;
