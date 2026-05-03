import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import './TopHeader.css';

/** Map resident routes to page titles */
const PAGE_TITLES = {
  '/dashboard': 'Home',
  '/announcements': 'Announcements',
  '/events': 'Events & Programs',
  '/household-profile': 'Household Profile',
  '/profile': 'My Profile',
};

const TopHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const pageTitle = PAGE_TITLES[location.pathname] || 'iBayan Portal';
  const initial = (userProfile?.fullName || currentUser?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="top-header">
      <div className="top-header-left">
        <h1 className="top-header-title">{pageTitle}</h1>
      </div>

      <div className="top-header-right">
        <NotificationBell />
        <button
          className="top-header-avatar"
          onClick={() => navigate('/profile')}
          title="My Profile"
          aria-label="Go to profile"
        >
          {initial}
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
