import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Megaphone, Calendar, AlertTriangle, Home, UserPlus, Settings,
} from 'lucide-react';
import useNotifications from '../hooks/useNotifications';
import './NotificationBell.css';

/* Icon map by notification type */
const TYPE_ICONS = {
  announcement: { Icon: Megaphone, cls: 'announcement' },
  event:        { Icon: Calendar,  cls: 'event' },
  alert:        { Icon: AlertTriangle, cls: 'alert' },
  household:    { Icon: Home,      cls: 'household' },
  resident:     { Icon: UserPlus,  cls: 'resident' },
  system:       { Icon: Settings,  cls: 'system' },
};

/** Human-friendly time-ago */
const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* Close on click outside */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      <button
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={22} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          {/* Header */}
          <div className="notif-dropdown-header">
            <h4 className="notif-dropdown-title">Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">
                  <Bell size={36} strokeWidth={1.5} />
                </span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const typeInfo = TYPE_ICONS[notif.type] || TYPE_ICONS.system;
                const { Icon, cls } = typeInfo;
                return (
                  <button
                    key={notif.id}
                    className={`notif-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleItemClick(notif)}
                  >
                    <div className={`notif-icon ${cls}`}>
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div className="notif-content">
                      <p className="notif-title">{notif.title}</p>
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">{timeAgo(notif.createdAt)}</span>
                    </div>
                    {!notif.read && <span className="notif-unread-dot" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
