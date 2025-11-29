import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout'; // Use the existing DashboardLayout
import useAuth from './hooks/useAuth'; // Use the newly created useAuth hook
import { useSessionToken } from './hooks/useSessionToken';

// Import all discovered pages
import Activity from './pages/Activity';
import Build from './pages/Build';
import Command from './pages/Command';
import Joe from './pages/Joe';
import Home from './pages/Home';
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
  const { isAuthenticated: hasToken } = useSessionToken();
  const { user, isLoading } = useAuth();

  // إذا لم يوجد توكن، نوجّه فوراً
  if (!hasToken()) {
    return <Navigate to="/" replace />;
  }

  // عند تقييد الأدوار، ننتظر تحميل معلومات المستخدم
  if (allowedRoles) {
    if (isLoading) return <div>Loading...</div>;
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard/overview" replace />;
    }
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.array,
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />

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
