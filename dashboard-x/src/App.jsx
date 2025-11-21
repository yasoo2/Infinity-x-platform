
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Page Imports
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Login';
import Overview from './pages/Overview';
import Joe from './pages/Joe';
import MonitoringPage from './pages/MonitoringPage';
import Users from './pages/Users';
import Activity from './pages/Activity';
import GoogleCallback from './pages/GoogleCallback';

// Component Imports
import RequireAuth from './components/RequireAuth';
import DashboardLayout from './components/DashboardLayout';
import NotFound from './pages/NotFound'; // Assuming you have a 404 component

// Mock Auth for now - replace with real auth context
const isAuthenticated = () => {
  const token = localStorage.getItem('session_token');
  return !!token;
};


function App() {
  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Protected Routes - Admin Dashboard */}
          <Route
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          >
            <Route path="/overview" element={<Overview />} />
            <Route path="/joe" element={<Joe />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/users" element={<Users />} />
            <Route path="/activity" element={<Activity />} />
            {/* Add other dashboard routes here */}
          </Route>
          
          {/* 404 Not Found Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
