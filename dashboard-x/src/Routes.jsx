import React, { Suspense, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Joe from './pages/Joe';
import { useSimpleAuthContext } from './context/SimpleAuthContext';

const Activity = React.lazy(() => import('./pages/Activity'));
const Build = React.lazy(() => import('./pages/Build'));
const Command = React.lazy(() => import('./pages/Command'));
const Home = React.lazy(() => import('./pages/Home'));
const LoginPage = React.lazy(() => import('./pages/SimpleLogin'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const SignupPage = React.lazy(() => import('./pages/Signup'));
const MonitoringPage = React.lazy(() => import('./pages/MonitoringPage'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Overview = React.lazy(() => import('./pages/Overview'));
const PageBuilder = React.lazy(() => import('./pages/PageBuilder'));
const SelfDesign = React.lazy(() => import('./pages/SelfDesign'));
const SuperAdminPanel = React.lazy(() => import('./pages/SuperAdminPanel'));
const UniversalStoreIntegration = React.lazy(() => import('./pages/UniversalStoreIntegration'));
const Users = React.lazy(() => import('./pages/Users'));

// Helper component for protected routes using simple auth
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useSimpleAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.array,
};

const SecurityReport = React.lazy(() => import('./pages/SecurityReport'));
const Knowledge = React.lazy(() => import('./pages/Knowledge'));

const AppRoutes = () => {
  class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error) { try { console.error('UI Error:', error); } catch { /* noop */ } }
    render() {
      if (this.state.hasError) {
        const msg = String(this.state.error?.message || 'Unexpected error');
        const stack = String(this.state.error?.stack || '').trim();
        return (
          <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1220' }}>
            <div style={{ padding: 24, borderRadius: 12, border: '1px solid #334155', background: '#111827', color: '#e2e8f0', maxWidth: 600, width: '90%' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>حدث خطأ في الواجهة</div>
              <div style={{ fontSize: 14, marginBottom: 12 }}>{msg}</div>
              {stack && (
                <pre style={{ fontSize: 12, lineHeight: 1.4, background: '#0b1220', padding: 12, borderRadius: 8, border: '1px solid #334155', overflowX: 'auto', maxHeight: 240 }}>{stack}</pre>
              )}
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Routes (Requires Authentication) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="joe" element={<Joe />} />
          <Route path="overview" element={<Overview />} />
          <Route path="activity" element={<Activity />} />
          <Route path="build" element={<Build />} />
          <Route path="command" element={<Command />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          
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