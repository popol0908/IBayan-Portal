import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Megaphone, Home, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminNavbar from '../../components/AdminNavbar';
import PageLoader from '../../components/PageLoader';
import './AdminDashboard.css';

const iconProps = { size: 28, strokeWidth: 1.8 };
const Icons = {
  people: <Users {...iconProps} />,
  megaphone: <Megaphone {...iconProps} />,
  home: <Home {...iconProps} />,
  alertTriangle: <AlertTriangle {...iconProps} />,
  clipboard: <ClipboardCheck {...iconProps} />,
};

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalHouseholds: 0,
    activeAlerts: 0,
    pendingVerification: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let loadedCount = 0;
    const total = 4; // 4 listeners
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= total) setIsLoading(false);
    };

    // 1) Verified residents → totalResidents
    const qVerified = query(collection(db, 'users'), where('status', '==', 'verified'));
    const unsubVerified = onSnapshot(qVerified, (snapshot) => {
      setStats((prev) => ({ ...prev, totalResidents: snapshot.size }));
      checkDone();
    }, (err) => { console.error('Error fetching verified users:', err); checkDone(); });

    // 2) Households → totalHouseholds
    const unsubHouseholds = onSnapshot(collection(db, 'households'), (snapshot) => {
      setStats((prev) => ({ ...prev, totalHouseholds: snapshot.size }));
      checkDone();
    }, (err) => { console.error('Error fetching households:', err); checkDone(); });

    // 3) Pending users → pendingVerification
    const qPending = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
      setStats((prev) => ({ ...prev, pendingVerification: snapshot.size }));
      checkDone();
    }, (err) => { console.error('Error fetching pending users:', err); checkDone(); });

    // 4) Active emergency alerts
    const unsubAlerts = onSnapshot(collection(db, 'emergencyAlerts'), (snapshot) => {
      const active = snapshot.docs.filter((d) => d.data().status === 'Active').length;
      setStats((prev) => ({ ...prev, activeAlerts: active }));
      checkDone();
    }, (err) => { console.error('Error fetching alerts:', err); checkDone(); });

    return () => {
      unsubVerified();
      unsubHouseholds();
      unsubPending();
      unsubAlerts();
    };
  }, []);

  const userName = currentUser?.displayName || 'Admin';

  return (
    <PageLoader isLoading={isLoading} loadingMessage="Loading dashboard...">
      <div className="admin-dashboard">
        <AdminNavbar />

        <div className="admin-content">
          <div className="admin-container">

            {/* ── Content Header ── */}
            <div className="dash-content-header">
              <div className="dash-header-left">
                <h1 className="dash-title">Admin Dashboard</h1>
                <p className="dash-subtitle">Welcome back, Admin. Here is what is happening in Barangay Mabayuan today.</p>
              </div>
              <div className="dash-header-right">
                <span className="dash-greeting">Welcome, {userName}!</span>
              </div>
            </div>

            {/* ── KPI Cards Row ── */}
            <div className="kpi-cards-row">
              <div className="kpi-card kpi-blue">
                <div className="kpi-icon-wrap kpi-icon-blue">{Icons.people}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Residents</span>
                  <span className="kpi-value">{stats.totalResidents.toLocaleString()}</span>
                  <span className="kpi-badge kpi-badge-green">Verified</span>
                </div>
              </div>

              <div className="kpi-card kpi-teal">
                <div className="kpi-icon-wrap kpi-icon-teal">{Icons.home}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Households</span>
                  <span className="kpi-value">{stats.totalHouseholds.toLocaleString()}</span>
                  <span className="kpi-badge kpi-badge-green">Recorded</span>
                </div>
              </div>

              <div className="kpi-card kpi-red">
                <div className="kpi-icon-wrap kpi-icon-red">{Icons.alertTriangle}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Active Emergency Alerts</span>
                  <span className="kpi-value">{stats.activeAlerts}</span>
                  {stats.activeAlerts > 0 ? (
                    <span className="kpi-badge kpi-badge-red">Critical</span>
                  ) : (
                    <span className="kpi-badge kpi-badge-green">All Clear</span>
                  )}
                </div>
              </div>

              <div className="kpi-card kpi-amber">
                <div className="kpi-icon-wrap kpi-icon-amber">{Icons.clipboard}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Pending Verification</span>
                  <span className="kpi-value">{stats.pendingVerification}</span>
                  {stats.pendingVerification > 0 ? (
                    <span className="kpi-badge kpi-badge-amber">Awaiting Review</span>
                  ) : (
                    <span className="kpi-badge kpi-badge-green">All Reviewed</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="dash-card dash-full-width">
              <div className="dash-card-header">
                <h2 className="dash-card-title">Quick Actions</h2>
              </div>
              <div className="quick-actions-grid">
                <Link to="/admin/announcements" className="quick-action-btn">
                  <div className="qa-icon-wrap qa-blue">{Icons.megaphone}</div>
                  <span className="qa-label">Announcements</span>
                </Link>
                <Link to="/admin/emergency-alerts" className="quick-action-btn">
                  <div className="qa-icon-wrap qa-red">{Icons.alertTriangle}</div>
                  <span className="qa-label">Emergency Alerts</span>
                </Link>
                <Link to="/admin/residents" className="quick-action-btn">
                  <div className="qa-icon-wrap qa-teal">{Icons.people}</div>
                  <span className="qa-label">Manage Residents</span>
                </Link>
                <Link to="/admin/households" className="quick-action-btn">
                  <div className="qa-icon-wrap qa-teal">{Icons.home}</div>
                  <span className="qa-label">Household Profiling</span>
                </Link>
                <Link to="/admin/accounts" className="quick-action-btn">
                  <div className="qa-icon-wrap qa-amber">{Icons.clipboard}</div>
                  <span className="qa-label">Admin Accounts</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageLoader>
  );
};

export default AdminDashboard;

