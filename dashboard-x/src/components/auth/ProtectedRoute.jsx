import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [], redirectTo = '/login' }) => {
  const { isAuthenticated, user, loading } = useAuthContext();
  const location = useLocation();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Checking authentication...</p>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  // Check role requirements if specified
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center max-w-md">
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 mb-4">
              <h2 className="text-xl font-semibold text-red-300 mb-2">Access Denied</h2>
              <p className="text-red-400">
                You don't have the required permissions to access this page.
              </p>
              {user.role && (
                <p className="text-red-500 text-sm mt-2">
                  Your current role: {user.role}
                </p>
              )}
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }
  
  // Render children if all checks pass
  return children;
};

export default ProtectedRoute;