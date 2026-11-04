import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { VehicleProvider } from './context/VehicleContext';

// Public — dimuat langsung agar kunjungan pertama cepat
import LandingPage      from './pages/public/LandingPage';
import Login            from './pages/public/LoginPage';
import Register         from './pages/public/RegisterPage';
import AdminLogin       from './pages/public/AdminLoginPage';
import NotFound         from './pages/NotFound';

// User dan Admin — dimuat saat halamannya dibuka (code-splitting), jadi pengunjung tidak mengunduh
// halaman yang tidak mereka pakai.
const Dashboard         = lazy(() => import('./pages/user/Dashboard'));
const LiveMonitoring    = lazy(() => import('./pages/user/LiveMonitoring'));
const BehaviorLog       = lazy(() => import('./pages/user/BehaviorLog'));
const Profile           = lazy(() => import('./pages/user/Profile'));

const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageDrivers     = lazy(() => import('./pages/admin/ManageDrivers'));
const Settings          = lazy(() => import('./pages/admin/Settings'));
const AdminProfile      = lazy(() => import('./pages/admin/AdminProfile'));
const DriverPerformance = lazy(() => import('./pages/admin/DriverPerformance'));

// Layout
import UserLayout   from './components/layout/UserLayout';
import AdminLayout  from './components/layout/AdminLayout';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader    from './components/common/PageLoader';

function RequireAuth({ children, requiredRole }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Memverifikasi akun..." />;
  if (!auth.currentUser) return <Navigate to={requiredRole === 'admin' ? '/admin/login' : '/login'} replace />;
  const userRole = auth.userData?.role || 'user';
  if (requiredRole === 'admin' && userRole !== 'admin') return <Navigate to="/dashboard" replace />;
  if (requiredRole === 'user'  && userRole === 'admin') return <Navigate to="/admin"     replace />;
  return children;
}

// Area isi halaman di dalam layout: sidebar dan navbar tetap tampil saat halaman dimuat, dan galat satu
// halaman tidak mengosongkan seluruh aplikasi. Kunci per alamat membuat penjaga mulai bersih tiap pindah halaman.
function Page({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
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
      <Route path="/dashboard"    element={<RequireAuth requiredRole="user"><UserLayout><Page><Dashboard /></Page></UserLayout></RequireAuth>} />
      <Route path="/monitoring"   element={<RequireAuth requiredRole="user"><UserLayout><Page><LiveMonitoring /></Page></UserLayout></RequireAuth>} />
      <Route path="/behavior-log" element={<RequireAuth requiredRole="user"><UserLayout><Page><BehaviorLog /></Page></UserLayout></RequireAuth>} />
      <Route path="/profile"      element={<RequireAuth requiredRole="user"><UserLayout><Page><Profile /></Page></UserLayout></RequireAuth>} />

      {/* Admin — sesuai BAB 3 */}
      <Route path="/admin"                    element={<RequireAuth requiredRole="admin"><AdminLayout><Page><AdminDashboard /></Page></AdminLayout></RequireAuth>} />
      <Route path="/admin/drivers"            element={<RequireAuth requiredRole="admin"><AdminLayout><Page><ManageDrivers /></Page></AdminLayout></RequireAuth>} />
      <Route path="/admin/driver-performance" element={<RequireAuth requiredRole="admin"><AdminLayout><Page><DriverPerformance /></Page></AdminLayout></RequireAuth>} />
      <Route path="/admin/settings"           element={<RequireAuth requiredRole="admin"><AdminLayout><Page><Settings /></Page></AdminLayout></RequireAuth>} />
      <Route path="/admin/profile"            element={<RequireAuth requiredRole="admin"><AdminLayout><Page><AdminProfile /></Page></AdminLayout></RequireAuth>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AlertProvider>
          <VehicleProvider>
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
          </VehicleProvider>
        </AlertProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}