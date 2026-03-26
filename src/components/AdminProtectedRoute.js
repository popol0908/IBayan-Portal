import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { currentUser, loading, userProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Check if user has admin role
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;
