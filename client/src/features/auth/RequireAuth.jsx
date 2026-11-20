import { Navigate, useLocation } from 'react-router';
import { Spinner } from '../../components/ui.jsx';
import { useAuth } from './AuthContext.jsx';

export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
