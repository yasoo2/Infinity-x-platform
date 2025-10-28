import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-bgDark">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
