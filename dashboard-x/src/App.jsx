import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Overview from './pages/Overview';
import Activity from './pages/Activity';
import Command from './pages/Command';
import Users from './pages/Users';
import Build from './pages/Build';
import SelfDesign from './pages/SelfDesign';
import UniversalStoreIntegration from './pages/UniversalStoreIntegration';
import PageBuilder from './pages/PageBuilder';
import Joe from './pages/Joe';
import JoeTest from './pages/Joe-test';
import JoeSimple from './pages/Joe-simple';
import JoeV2 from './pages/Joe-v2';
import SuperAdminPanel from './pages/SuperAdminPanel';
import MonitoringPage from './pages/MonitoringPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Dashboard Routes - All under root */}
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/overview" element={<Overview />} />
          <Route path="/joe" element={<Joe />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/command" element={<Command />} />
          <Route path="/users" element={<Users />} />
          <Route path="/build" element={<Build />} />
          <Route path="/self-design" element={<SelfDesign />} />
          <Route path="/store-integration" element={<UniversalStoreIntegration />} />
          <Route path="/page-builder" element={<PageBuilder />} />
          <Route path="/super-admin" element={<SuperAdminPanel />} />
          <Route path="/joe-v2" element={<JoeV2 />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
