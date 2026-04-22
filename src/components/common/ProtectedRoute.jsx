import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth state
  if (loading) {
    return <Loading fullScreen text="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for required role
  if (requiredRole && userRole !== requiredRole) {
    // If admin required but user is not admin, redirect to dashboard
    if (requiredRole === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}