import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Activity from './pages/Activity';
import Command from './pages/Command';
import Users from './pages/Users';
import Build from './pages/Build';

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
        </Route>

        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
