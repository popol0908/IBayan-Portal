import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import NotificationBell from './NotificationBell';
import './AdminTopHeader.css';

/** Route-aware search placeholders */
const SEARCH_PLACEHOLDERS = {
  '/admin/dashboard':     'Search dashboard...',
  '/admin/announcements': 'Search announcements...',
  '/admin/residents':     'Search residents...',
  '/admin/households':    'Search household profiles...',
  '/admin/events':        'Search events & programs...',
  '/admin/accounts':      'Search admin accounts...',
};

const AdminTopHeader = () => {
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();

  const placeholder = SEARCH_PLACEHOLDERS[location.pathname] || 'Search...';
  const displayName =
    userProfile?.fullName ||
    currentUser?.displayName ||
    currentUser?.email ||
    'Admin';

  return (
    <header className="admin-top-header">
      <div className="admin-top-header-left">
        <div className="admin-top-search-wrap">
          <Search size={16} strokeWidth={2} className="admin-top-search-icon" />
          <input
            type="text"
            className="admin-top-search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-top-header-right">
        <NotificationBell />
        <span className="admin-top-header-name">{displayName}</span>
      </div>
    </header>
  );
};

export default AdminTopHeader;
