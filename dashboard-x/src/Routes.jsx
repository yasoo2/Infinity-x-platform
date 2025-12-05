import React, { Suspense, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import useAuth from './hooks/useAuth';
import { useSessionToken } from './hooks/useSessionToken';
import { getGuestToken } from './api/system';

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
  const { token, saveToken, isAuthenticated: hasToken } = useSessionToken();
  const { user, isLoading } = useAuth();
  const [guestTrying, setGuestTrying] = useState(false);
  const [guestFailed, setGuestFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (hasToken()) return;
      if (guestTrying) return;
      setGuestTrying(true);
      try {
        const res = await getGuestToken();
        const t = res?.token || res?.data?.token;
        if (t) {
          saveToken(t);
          setGuestFailed(false);
        } else {
          setGuestFailed(true);
        }
      } catch {
        setGuestFailed(true);
      } finally {
        setGuestTrying(false);
      }
    };
    run();
  }, [hasToken, guestTrying, saveToken]);

  if (!hasToken()) {
    if (guestTrying) return <div>Loading...</div>;
    if (!token && guestFailed) return <Navigate to="/" replace />;
    return <div>Loading...</div>;
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
const SecurityReport = React.lazy(() => import('./pages/SecurityReport'));
const Knowledge = React.lazy(() => import('./pages/Knowledge'));

const JoeScreenPage = () => {
  const navigate = useNavigate();
  const [isProcessing] = React.useState(false);
  const [progress] = React.useState(0);
  const [wsLog] = React.useState([]);

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
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error) { try { console.error('UI Error:', error); } catch { /* noop */ } }
    render() {
      if (this.state.hasError) {
        const msg = String(this.state.error?.message || 'Unexpected error');
        return (
          <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1220' }}>
            <div style={{ padding: 24, borderRadius: 12, border: '1px solid #334155', background: '#111827', color: '#e2e8f0', maxWidth: 600, width: '90%' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>حدث خطأ في الواجهة</div>
              <div style={{ fontSize: 14, marginBottom: 12 }}>{msg}</div>
              <button onClick={() => location.reload()} style={{ background: '#0ea5e9', color: 'white', padding: '8px 12px', borderRadius: 8 }}>إعادة التحميل</button>
            </div>
          </div>
        );
      }
      return this.props.children;
    }
  }
  ErrorBoundary.propTypes = { children: PropTypes.node };
  return (
    <Router>
      <ErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><div style={{ color: '#0ea5e9', fontWeight: 700 }}>Loading...</div></div>}>
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
          <Route path="joe-screen" element={<JoeScreenPage />} />
          <Route path="browser-full" element={<BrowserFullPage />} />
          <Route path="browser-viewer" element={<BrowserViewerPage />} />
          <Route path="security" element={<SecurityReport />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="page-builder" element={<PageBuilder />} />
          <Route path="self-design" element={<SelfDesign />} />
          <Route path="universal-store" element={<UniversalStoreIntegration />} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['super_admin', 'admin']}><Users /></ProtectedRoute>} />
          <Route path="super-admin" element={<ProtectedRoute allowedRoles={['super_admin']}><SuperAdminPanel /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
};

export default AppRoutes;
