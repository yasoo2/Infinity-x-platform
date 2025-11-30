import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import useAuth from './hooks/useAuth';
import { useSessionToken } from './hooks/useSessionToken';

const Activity = React.lazy(() => import('./pages/Activity'));
const Build = React.lazy(() => import('./pages/Build'));
const Command = React.lazy(() => import('./pages/Command'));
const Joe = React.lazy(() => import('./pages/Joe'));
const Home = React.lazy(() => import('./pages/Home'));
const MonitoringPage = React.lazy(() => import('./pages/MonitoringPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Overview = React.lazy(() => import('./pages/Overview'));
const PageBuilder = React.lazy(() => import('./pages/PageBuilder'));
const SelfDesign = React.lazy(() => import('./pages/SelfDesign'));
const SuperAdminPanel = React.lazy(() => import('./pages/SuperAdminPanel'));
const UniversalStoreIntegration = React.lazy(() => import('./pages/UniversalStoreIntegration'));
const Users = React.lazy(() => import('./pages/Users'));



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

import JoeScreen from './components/JoeScreen';
import FullScreenBrowser from './components/FullScreenBrowser';
import BrowserViewer from './components/BrowserViewer';

const JoeScreenPage = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [wsLog, setWsLog] = React.useState([]);

  const onTakeover = () => {};
  const onClose = () => navigate('/dashboard/joe');

  return (
    <JoeScreen
      isProcessing={isProcessing}
      progress={progress}
      wsLog={wsLog}
      onTakeover={onTakeover}
      onClose={onClose}
    />
  );
};

const BrowserFullPage = () => {
  const navigate = useNavigate();
  return <FullScreenBrowser onClose={() => navigate('/dashboard/joe')} />;
};

const BrowserViewerPage = () => {
  const navigate = useNavigate();
  return <BrowserViewer sessionId={"default"} onClose={() => navigate('/dashboard/joe')} language={'ar'} />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
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
          <Route path="joe-screen" element={<JoeScreenPage />} />
          <Route path="browser-full" element={<BrowserFullPage />} />
          <Route path="browser-viewer" element={<BrowserViewerPage />} />
          <Route path="page-builder" element={<PageBuilder />} />
          <Route path="self-design" element={<SelfDesign />} />
          <Route path="universal-store" element={<UniversalStoreIntegration />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><Users /></ProtectedRoute>} />
          <Route path="super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminPanel /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRoutes;
