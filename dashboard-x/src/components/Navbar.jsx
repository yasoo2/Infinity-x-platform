import { Link, useNavigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';

export default function Navbar() {
  const { clearToken } = useSessionToken();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const navLinks = [
    { to: '/joe', label: '🤖 JOE' },
    { to: '/overview', label: 'Overview' },
    { to: '/build', label: '🎨 Build' },
    { to: '/page-builder', label: '🚀 Page Builder' },
    { to: '/self-design', label: '🤖 Self-Design' },
    { to: '/store-integration', label: '🛍️ Stores' },
    { to: '/activity', label: 'Activity' },
    { to: '/command', label: 'Command' },
    { to: '/users', label: 'Users' },
  ];

  return (
    <nav className="bg-cardDark border-b border-textDim/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-neonGreen">Infinity</span>
                <span className="text-neonBlue">X</span>
                <span className="text-textDim text-sm ml-2">Dashboard</span>
              </h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-textDim hover:text-neonGreen transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-neonPink hover:text-white hover:bg-neonPink/20 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
