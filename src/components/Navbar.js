import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Megaphone,
  Siren,
  Calendar,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const iconProps = { size: 20, strokeWidth: 1.8 };
const chevronProps = { size: 18, strokeWidth: 2 };

const icons = {
  home: <Home {...iconProps} />,
  megaphone: <Megaphone {...iconProps} />,
  siren: <Siren {...iconProps} />,
  calendar: <Calendar {...iconProps} />,
  user: <User {...iconProps} />,
  logout: <LogOut {...iconProps} />,
  chevronLeft: <ChevronLeft {...chevronProps} />,
  chevronRight: <ChevronRight {...chevronProps} />,
  warning: <AlertTriangle {...iconProps} />,
  clipboardList: <ClipboardList {...iconProps} />,
};

const Navbar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: icons.home },
    { path: '/announcements', label: 'Announcements', icon: icons.megaphone },
    { path: '/emergency-alerts', label: 'Emergency Alerts', icon: icons.siren },
    { path: '/events', label: 'Events & Programs', icon: icons.calendar },
    { path: '/household-profile', label: 'Household Profile', icon: icons.clipboardList },
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
      await logout();
      setShowLogoutDialog(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNavClick = (e, path) => {
    // Navigation without loading screen
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

      <div className="sidebar-wrapper">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
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

          {/* Collapsed: click logo area to expand */}
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
            <Link
              to="/profile"
              onClick={(e) => handleNavClick(e, '/profile')}
              className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'active' : ''}`}
              title="Profile"
            >
              <span className="profile-icon">{icons.user}</span>
              {isSidebarOpen && <span className="profile-label">Profile</span>}
            </Link>
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
            <p className="dialog-message">Are you sure you want to logout?</p>
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

export default Navbar;
