import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { VehicleProvider } from './context/VehicleContext';

// Public
import LandingPage      from './pages/public/LandingPage';
import Login            from './pages/public/LoginPage';
import Register         from './pages/public/RegisterPage';
import AdminLogin       from './pages/public/AdminLoginPage';
import NotFound         from './pages/NotFound';

// User
import Dashboard        from './pages/user/Dashboard';
import LiveMonitoring   from './pages/user/LiveMonitoring';
import BehaviorLog      from './pages/user/BehaviorLog';
import Profile          from './pages/user/Profile';

// Admin
import AdminDashboard   from './pages/admin/AdminDashboard';
import ManageDrivers    from './pages/admin/ManageDrivers';
import Settings         from './pages/admin/Settings';
import AdminProfile     from './pages/admin/AdminProfile';
import DriverPerformance from './pages/admin/DriverPerformance';

// Layout
import UserLayout   from './components/layout/UserLayout';
import AdminLayout  from './components/layout/AdminLayout';
import LoadingScreen from './components/common/LoadingScreen';

function RequireAuth({ children, requiredRole }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Memverifikasi akun..." />;
  if (!auth.currentUser) return <Navigate to="/login" replace />;
  const userRole = auth.userData?.role || 'user';
  if (requiredRole === 'admin' && userRole !== 'admin') return <Navigate to="/dashboard" replace />;
  if (requiredRole === 'user'  && userRole === 'admin') return <Navigate to="/admin"     replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"            element={<LandingPage />} />
      <Route path="/login"       element={<Login />} />
      <Route path="/register"    element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* User — sesuai BAB 3 */}
      <Route path="/dashboard"    element={<RequireAuth requiredRole="user"><UserLayout><Dashboard /></UserLayout></RequireAuth>} />
      <Route path="/monitoring"   element={<RequireAuth requiredRole="user"><UserLayout><LiveMonitoring /></UserLayout></RequireAuth>} />
      <Route path="/behavior-log" element={<RequireAuth requiredRole="user"><UserLayout><BehaviorLog /></UserLayout></RequireAuth>} />
      <Route path="/profile"      element={<RequireAuth requiredRole="user"><UserLayout><Profile /></UserLayout></RequireAuth>} />

      {/* Admin — sesuai BAB 3 */}
      <Route path="/admin"                    element={<RequireAuth requiredRole="admin"><AdminLayout><AdminDashboard /></AdminLayout></RequireAuth>} />
      <Route path="/admin/drivers"            element={<RequireAuth requiredRole="admin"><AdminLayout><ManageDrivers /></AdminLayout></RequireAuth>} />
      <Route path="/admin/driver-performance" element={<RequireAuth requiredRole="admin"><AdminLayout><DriverPerformance /></AdminLayout></RequireAuth>} />
      <Route path="/admin/settings"           element={<RequireAuth requiredRole="admin"><AdminLayout><Settings /></AdminLayout></RequireAuth>} />
      <Route path="/admin/profile"            element={<RequireAuth requiredRole="admin"><AdminLayout><AdminProfile /></AdminLayout></RequireAuth>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VehicleProvider>
          <AlertProvider>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
              toastStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
              }}
            />
            <AppRoutes />
          </AlertProvider>
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}