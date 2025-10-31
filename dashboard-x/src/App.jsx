import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Activity from './pages/Activity';
import Command from './pages/Command';
import Users from './pages/Users';
import Build from './pages/Build';
import SelfDesign from './pages/SelfDesign';
import UniversalStoreIntegration from './pages/UniversalStoreIntegration';
import PageBuilder from './pages/PageBuilder';
import Joe from './pages/Joe';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="activity" element={<Activity />} />
          <Route path="command" element={<Command />} />
          <Route path="users" element={<Users />} />
          <Route path="build" element={<Build />} />
          <Route path="self-design" element={<SelfDesign />} />
          <Route path="store-integration" element={<UniversalStoreIntegration />} />
          <Route path="page-builder" element={<PageBuilder />} />
          <Route path="joe" element={<Joe />} />
        </Route>

        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
