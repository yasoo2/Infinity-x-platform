import { Navigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';

export default function RequireAuth({ children }) {
  const { isAuthenticated } = useSessionToken();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
