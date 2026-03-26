import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Loading from './components/Loading';
import ChatAssistant from './components/ChatAssistant';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import EmergencyAlerts from './pages/EmergencyAlerts';
import PendingVerification from './pages/PendingVerification';
import VerificationDeclined from './pages/VerificationDeclined';
import Profile from './pages/Profile';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAnnouncements from './pages/admin/ManageAnnouncements';
import ManageEmergencyAlerts from './pages/admin/ManageEmergencyAlerts';
import ResidentVerification from './pages/admin/ResidentVerification';
import ManageAdminAccounts from './pages/admin/ManageAdminAccounts';

import Events from './pages/Events';
import ManageEvents from './pages/admin/ManageEvents';
import './App.css';
import './styles/common.css';

function AppContent() {
  const location = useLocation();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { currentUser } = useAuth();
  const prevLocationRef = useRef(location.pathname);
  const loadingTimeoutRef = useRef(null);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isLandingPage = location.pathname === '/';
  const isAdminLoginPage = location.pathname === '/admin/login';

  // Only show ChatAssistant when user is authenticated and not on public pages
  const shouldShowChatAssistant = currentUser && !isLandingPage && !isAuthPage && !isAdminLoginPage;

  // Detect route changes and show loading
  useEffect(() => {
    // Skip loading for initial load or if navigating to/from auth pages
    if (prevLocationRef.current === location.pathname) {
      return;
    }

    // Don't show loading for auth page transitions
    const isAuthTransition =
      location.pathname === '/login' ||
      location.pathname === '/signup' ||
      prevLocationRef.current === '/login' ||
      prevLocationRef.current === '/signup';

    if (!isAuthTransition) {
      startLoading('Loading page...');

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Auto-stop loading after a maximum time (safety net)
      loadingTimeoutRef.current = setTimeout(() => {
        stopLoading();
      }, 5000);

      // Stop loading when route change is complete
      // Use a delay to allow page components to mount and start their own loading states
      const timer = setTimeout(() => {
        stopLoading();
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }, 500);

      prevLocationRef.current = location.pathname;

      return () => {
        clearTimeout(timer);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    } else {
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname, startLoading, stopLoading]);

  // Manage body scroll lock when loading
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('loading-active');
    } else {
      document.body.classList.remove('loading-active');
    }
    return () => {
      document.body.classList.remove('loading-active');
    };
  }, [isLoading]);

  return (
    <>
      {isLoading && <Loading message="Loading page..." />}
      <div className="App">
        {!isAuthPage && !isAdminPage && !isLandingPage && <Navbar />}
        <main className="main-content">
          <Routes>
            { }
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireVerified>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute>
                  <Announcements />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emergency-alerts"
              element={
                <ProtectedRoute requireVerified>
                  <EmergencyAlerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/pending"
              element={
                <ProtectedRoute>
                  <PendingVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verification/declined"
              element={
                <ProtectedRoute>
                  <VerificationDeclined />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/events"
              element={
                <ProtectedRoute requireVerified>
                  <Events />
                </ProtectedRoute>
              }
            />

            { }
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/announcements"
              element={
                <AdminProtectedRoute>
                  <ManageAnnouncements />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/emergency-alerts"
              element={
                <AdminProtectedRoute>
                  <ManageEmergencyAlerts />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/residents"
              element={
                <AdminProtectedRoute>
                  <ResidentVerification />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/accounts"
              element={
                <AdminProtectedRoute>
                  <ManageAdminAccounts />
                </AdminProtectedRoute>
              }
            />

            <Route
              path="/admin/events"
              element={
                <AdminProtectedRoute>
                  <ManageEvents />
                </AdminProtectedRoute>
              }
            />
            <Route path="/" element={<Landing />} />
          </Routes>
        </main>
        {!isAuthPage && !isAdminPage && !isLandingPage && <Footer />}
      </div>
      {shouldShowChatAssistant && <ChatAssistant />}
      <SpeedInsights />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LoadingProvider>
          <Router>
            <AppContent />
          </Router>
        </LoadingProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
