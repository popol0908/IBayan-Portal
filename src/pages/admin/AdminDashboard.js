import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Megaphone, Home, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSharedData, subscribeToChanges } from '../../services/dataService';
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

  const updateStats = async () => {
    try {
      const alerts = await getSharedData('emergencyAlerts');
      const activeAlerts = alerts.filter(alert => alert.status === 'Active').length;

      setStats({
        totalResidents: 22345,
        totalHouseholds: 5102,
        activeAlerts: activeAlerts || 3,
        pendingVerification: 45,
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats({
        totalResidents: 22345,
        totalHouseholds: 5102,
        activeAlerts: 3,
        pendingVerification: 45,
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateStats();
    const unsubscribeAlerts = subscribeToChanges('emergencyAlerts', () => {
      updateStats();
    });
    return () => {
      unsubscribeAlerts();
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = currentUser?.displayName || 'Marisa';

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
                  <span className="kpi-badge kpi-badge-green">↑ +2% vs last month</span>
                </div>
              </div>

              <div className="kpi-card kpi-teal">
                <div className="kpi-icon-wrap kpi-icon-teal">{Icons.home}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Households</span>
                  <span className="kpi-value">{stats.totalHouseholds.toLocaleString()}</span>
                  <span className="kpi-badge kpi-badge-green">↑ +1% vs last month</span>
                </div>
              </div>

              <div className="kpi-card kpi-red">
                <div className="kpi-icon-wrap kpi-icon-red">{Icons.alertTriangle}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Active Emergency Alerts</span>
                  <span className="kpi-value">{stats.activeAlerts}</span>
                  <span className="kpi-badge kpi-badge-red">Critical</span>
                </div>
              </div>

              <div className="kpi-card kpi-amber">
                <div className="kpi-icon-wrap kpi-icon-amber">{Icons.clipboard}</div>
                <div className="kpi-info">
                  <span className="kpi-label">Pending Verification</span>
                  <span className="kpi-value">{stats.pendingVerification}</span>
                  <span className="kpi-badge kpi-badge-amber">Awaiting Review</span>
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
