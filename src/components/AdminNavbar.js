import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Megaphone,
  Siren,
  CheckCircle,
  Home,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLoading } from '../contexts/LoadingContext';
import './AdminNavbar.css';

const iconProps = { size: 20, strokeWidth: 1.8 };
const chevronProps = { size: 18, strokeWidth: 2 };

const icons = {
  chart: <BarChart2 {...iconProps} />,
  megaphone: <Megaphone {...iconProps} />,
  siren: <Siren {...iconProps} />,
  checkCircle: <CheckCircle {...iconProps} />,
  home: <Home {...iconProps} />,
  calendar: <Calendar {...iconProps} />,
  gear: <Settings {...iconProps} />,
  logout: <LogOut {...iconProps} />,
  chevronLeft: <ChevronLeft {...chevronProps} />,
  chevronRight: <ChevronRight {...chevronProps} />,
  warning: <AlertTriangle {...iconProps} />,
};

const AdminNavbar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { startLoading } = useLoading();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: icons.chart },
    { path: '/admin/announcements', label: 'Announcements', icon: icons.megaphone },
    { path: '/admin/emergency-alerts', label: 'Emergency Alerts', icon: icons.siren },
    { path: '/admin/residents', label: 'Resident Verification', icon: icons.checkCircle },
    { path: '/admin/households', label: 'Household Profiling', icon: icons.home },
    { path: '/admin/events', label: 'Events & Programs', icon: icons.calendar },
    { path: '/admin/accounts', label: 'Admin Accounts', icon: icons.gear },
  ];

  // Manage body classes for layout shifting
  useEffect(() => {
    const handleLayout = () => {
      // Only apply margin shifts on desktop
      if (window.innerWidth > 768) {
        if (isSidebarOpen) {
          document.body.classList.remove('sidebar-collapsed');
          document.body.classList.add('sidebar-expanded');
        } else {
          document.body.classList.remove('sidebar-expanded');
          document.body.classList.add('sidebar-collapsed');
        }
      } else {
        document.body.classList.remove('sidebar-expanded', 'sidebar-collapsed');
      }
    };

    handleLayout();
    window.addEventListener('resize', handleLayout);

    return () => {
      window.removeEventListener('resize', handleLayout);
      document.body.classList.remove('sidebar-expanded', 'sidebar-collapsed');
    };
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    try {
      startLoading('Logging out...');
      await logout();
      setShowLogoutDialog(false);
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavClick = (e, path) => {
    if (location.pathname !== path) {
      startLoading('Loading page...');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const toggleLogoutDialog = () => {
    setShowLogoutDialog(!showLogoutDialog);
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="mobile-hamburger"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Toggle navigation menu"
        title="Menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className="admin-sidebar-wrapper">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <img src="/logo.png" alt="Barangay Mabayuan Seal" className="brand-logo" />
              {isSidebarOpen && <span className="brand-text">iBayan Portal</span>}
            </div>
            {isSidebarOpen && (
              <button
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                {icons.chevronLeft}
              </button>
            )}
          </div>

          {/* Collapsed: expand button */}
          {!isSidebarOpen && (
            <button
              className="sidebar-expand-btn"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              {icons.chevronRight}
            </button>
          )}

          {/* Navigation Items */}
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {isSidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <button
              className="sidebar-logout-btn"
              onClick={toggleLogoutDialog}
              title="Logout"
            >
              <span className="logout-icon">{icons.logout}</span>
              {isSidebarOpen && <span className="logout-label">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div className="logout-overlay" onClick={toggleLogoutDialog}>
          <div className="logout-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">
              <span className="warning-icon">{icons.warning}</span>
              Confirm Logout
            </h3>
            <p className="dialog-message">Are you sure you want to logout from the admin portal?</p>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={toggleLogoutDialog}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminNavbar;
