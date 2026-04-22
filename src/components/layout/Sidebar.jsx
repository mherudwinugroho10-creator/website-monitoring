import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, FileText, MapPin, Bell, Users, Truck, Settings, LogOut, ChevronLeft, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function Sidebar({ isOpen, setIsOpen }) {
  var auth = useAuth();
  var userData = auth.userData;
  var logout = auth.logout;
  var navigate = useNavigate();

  var userMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/monitoring', icon: Activity, label: 'Live Monitoring' },
    { path: '/behavior-log', icon: FileText, label: 'Behavior Log' },
    { path: '/trips', icon: MapPin, label: 'Trip History' },
    { path: '/alerts', icon: Bell, label: 'Alerts' },
  ];

  var adminMenuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Admin Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Manage Users' },
    { path: '/admin/vehicles', icon: Truck, label: 'Manage Vehicles' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  async function handleLogout() {
    var result = await logout();
    if (result.success) {
      toast.success('Logout berhasil!');
      navigate('/login');
    } else {
      toast.error('Logout gagal. Silakan coba lagi.');
    }
  }

  function renderMenuItem(item) {
    return (
      <li key={item.path}>
        <NavLink
          to={item.path}
          className={function(props) {
            var baseClass = 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200';
            var activeClass = props.isActive ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white';
            var sizeClass = !isOpen ? 'lg:justify-center' : '';
            return baseClass + ' ' + activeClass + ' ' + sizeClass;
          }}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
        </NavLink>
      </li>
    );
  }

  return (
    <div>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={function() { setIsOpen(false); }}
        />
      )}

      <aside className={'fixed top-0 left-0 h-full z-50 bg-dark-secondary border-r border-white/5 transition-all duration-300 ease-in-out overflow-hidden ' + (isOpen ? 'w-64' : 'w-0 lg:w-20')}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
            <div className={'flex items-center gap-3 ' + (!isOpen ? 'lg:justify-center' : '')}>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-gold" />
              </div>
              {isOpen && (
                <span className="text-lg font-bold text-white whitespace-nowrap">
                  SAFE<span className="text-gold">DRIVE</span>
                </span>
              )}
            </div>
            {isOpen && (
              <button 
                onClick={function() { setIsOpen(false); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors lg:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-3 mb-6">
              {isOpen && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Main Menu
                </p>
              )}
              <ul className="space-y-1">
                {userMenuItems.map(renderMenuItem)}
              </ul>
            </div>

            <div className="px-3 mb-6">
              {isOpen && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Admin
                </p>
              )}
              <ul className="space-y-1">
                {adminMenuItems.map(renderMenuItem)}
              </ul>
            </div>

            <div className="px-3">
              {isOpen && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Account
                </p>
              )}
              <ul className="space-y-1">
                <li>
                  <NavLink
                    to="/profile"
                    className={function(props) {
                      var baseClass = 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200';
                      var activeClass = props.isActive ? 'bg-gold/10 text-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white';
                      var sizeClass = !isOpen ? 'lg:justify-center' : '';
                      return baseClass + ' ' + activeClass + ' ' + sizeClass;
                    }}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="whitespace-nowrap">Profile</span>}
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-status-danger/10 hover:text-status-danger transition-all duration-200 ' + (!isOpen ? 'lg:justify-center' : '')}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span className="whitespace-nowrap">Logout</span>}
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {isOpen && userData && (
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-semibold">
                    {userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">
                    {userData.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userData.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}