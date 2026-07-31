import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RoleProtectedRoute({ roles }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
