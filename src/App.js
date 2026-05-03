import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { LoadingProvider, useLoading } from "./contexts/LoadingContext";
import { SearchProvider } from "./contexts/SearchContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Navbar from "./components/Navbar";
import TopHeader from "./components/TopHeader";
import AdminTopHeader from "./components/AdminTopHeader";
import Footer from "./components/Footer";
import Loading from "./components/Loading";
import ChatAssistant from "./components/ChatAssistant";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import PendingVerification from "./pages/PendingVerification";
import VerificationDeclined from "./pages/VerificationDeclined";
import Profile from "./pages/Profile";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAnnouncements from "./pages/admin/ManageAnnouncements";
import ResidentVerification from "./pages/admin/ResidentVerification";
import ManageAdminAccounts from "./pages/admin/ManageAdminAccounts";
import HouseholdProfiling from "./pages/admin/HouseholdProfiling";
import ChangePassword from "./pages/admin/ChangePassword";
import HouseholdProfile from "./pages/HouseholdProfile";

import Events from "./pages/Events";
import ManageEvents from "./pages/admin/ManageEvents";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import "./App.css";
import "./styles/common.css";

function AppContent() {
  const location = useLocation();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const { currentUser } = useAuth();
  const prevLocationRef = useRef(location.pathname);
  const loadingTimeoutRef = useRef(null);

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password";
  const isAdminPage = location.pathname.startsWith("/admin");
  const isLandingPage = location.pathname === "/";
  const isAdminLoginPage = location.pathname === "/admin/login";

  // Only show ChatAssistant when user is authenticated and not on public pages
  const shouldShowChatAssistant =
    currentUser && !isLandingPage && !isAuthPage && !isAdminLoginPage;

  // Detect route changes and show loading
  useEffect(() => {
    // Skip loading for initial load or if navigating to/from auth pages
    if (prevLocationRef.current === location.pathname) {
      return;
    }

    // Don't show loading for auth page transitions
    const isAuthTransition =
      location.pathname === "/login" ||
      location.pathname === "/signup" ||
      location.pathname === "/forgot-password" ||
      location.pathname === "/reset-password" ||
      prevLocationRef.current === "/login" ||
      prevLocationRef.current === "/signup" ||
      prevLocationRef.current === "/forgot-password" ||
      prevLocationRef.current === "/reset-password";

    if (!isAuthTransition) {
      startLoading("Loading page...");

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
      document.body.classList.add("loading-active");
    } else {
      document.body.classList.remove("loading-active");
    }
    return () => {
      document.body.classList.remove("loading-active");
    };
  }, [isLoading]);

  return (
    <>
      {isLoading && <Loading message="Loading page..." />}
      <div className="App">
        {!isAuthPage && !isAdminPage && !isLandingPage && (
          <>
            <Navbar />
            <TopHeader />
          </>
        )}
        {isAdminPage && !isAdminLoginPage && <AdminTopHeader />}
        <main className={`main-content ${(!isAuthPage && !isLandingPage) ? 'has-top-header' : ''} ${isAdminPage && !isAdminLoginPage ? 'admin-main' : ''}`}>
          <Routes>
            {}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route
              path="/household-profile"
              element={
                <ProtectedRoute requireVerified>
                  <HouseholdProfile />
                </ProtectedRoute>
              }
            />

            {}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/change-password"
              element={
                <AdminProtectedRoute>
                  <ChangePassword />
                </AdminProtectedRoute>
              }
            />
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
            <Route
              path="/admin/households"
              element={
                <AdminProtectedRoute>
                  <HouseholdProfiling />
                </AdminProtectedRoute>
              }
            />
            <Route path="/verify-email" element={<EmailVerification />} />
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
            <SearchProvider>
              <AppContent />
            </SearchProvider>
          </Router>
        </LoadingProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
