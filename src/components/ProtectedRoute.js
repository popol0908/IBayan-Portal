import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireVerified = false }) => {
  const { currentUser, loading, userProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified) {
    const status = userProfile?.status || 'pending';
    if (status === 'pending') {
      return <Navigate to="/verification/pending" replace />;
    }
    if (status === 'declined') {
      return <Navigate to="/verification/declined" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
