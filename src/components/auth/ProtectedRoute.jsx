import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../common/LoadingScreen';

export default function ProtectedRoute({ requiredRole }) {
  var auth = useAuth();
  var currentUser = auth.currentUser;
  var userData = auth.userData;
  var loading = auth.loading;

  if (loading) {
    return <LoadingScreen message="Memverifikasi akun..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Cek role
  var userRole = (userData && userData.role) ? userData.role : 'user';

  if (requiredRole === 'admin' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'user' && userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}