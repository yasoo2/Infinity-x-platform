import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout'; // Use the existing DashboardLayout
import useAuth from './hooks/useAuth'; // Use the newly created useAuth hook

// Import all discovered pages
import Activity from './pages/Activity';
import Build from './pages/Build';
import Command from './pages/Command';
import Joe from './pages/Joe';
import Home from './pages/Home';
import LoginPage from './pages/Login';
import MonitoringPage from './pages/MonitoringPage';
import NotFound from './pages/NotFound';
import Overview from './pages/Overview';
import PageBuilder from './pages/PageBuilder';
import SelfDesign from './pages/SelfDesign';
import SuperAdminPanel from './pages/SuperAdminPanel';
import UniversalStoreIntegration from './pages/UniversalStoreIntegration';
import Users from './pages/Users';



// Helper component for protected routes
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!isAuthenticated) {
    // Redirect to the external login page/card
    // Assuming the external login is handled by the root domain or a specific path
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/overview" replace />; // Redirect unauthorized users
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (Requires Authentication) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="joe" element={<Joe />} />
          <Route path="overview" element={<Overview />} />
          <Route path="activity" element={<Activity />} />
          <Route path="build" element={<Build />} />
          <Route path="command" element={<Command />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="page-builder" element={<PageBuilder />} />
          <Route path="self-design" element={<SelfDesign />} />
          <Route path="universal-store" element={<UniversalStoreIntegration />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><Users /></ProtectedRoute>} />
          <Route path="super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminPanel /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
