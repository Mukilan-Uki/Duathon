import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ roles }) {
  const { authenticated, initializing, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-600">
        Restoring secure session…
      </div>
    );
  }
  if (!authenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/profile" replace />;
  return <Outlet />;
}
