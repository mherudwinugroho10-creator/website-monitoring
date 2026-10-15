import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, FileText, User, LogOut, ChevronLeft, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function UserSidebar({ isOpen, setIsOpen }) {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard'    },
    { icon: Activity,        label: 'Live Monitoring', path: '/monitoring'   },
    { icon: FileText,        label: 'Behavior Log',    path: '/behavior-log' },
  ];

  async function handleLogout() {
    const result = await logout();
    if (result.success) {
      toast.success('Logout berhasil!');
      navigate('/login');
    }
  }

  const initials = userData?.name ? userData.name.charAt(0).toUpperCase() : 'U';

  function MenuLink({ item }) {
    return (
      <li>
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-gold/10 text-gold font-medium'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            } ${!isOpen ? 'lg:justify-center' : ''}`
          }
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span>{item.label}</span>}
        </NavLink>
      </li>
    );
  }

  return (
    <div>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full z-50 bg-dark-secondary border-r border-white/[0.06] transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'w-64' : 'w-0 lg:w-20'}`}>
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
            <div className={`flex items-center gap-3 ${!isOpen ? 'lg:justify-center lg:w-full' : ''}`}>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              {isOpen && (
                <span className="text-lg font-bold text-white whitespace-nowrap">
                  SAFE<span className="text-gold">DRIVE</span>
                </span>
              )}
            </div>
            {isOpen && (
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors lg:hidden">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Role Badge */}
          {isOpen && (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium">
                <Activity className="w-3.5 h-3.5" />
                Driver / Operator
              </span>
            </div>
          )}

          {/* Menu */}
          <nav className="flex-1 py-4 overflow-y-auto">
            <div className="px-3 mb-6">
              {isOpen && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">Monitoring</p>
              )}
              <ul className="space-y-1">
                {menuItems.map((item) => <MenuLink key={item.path} item={item} />)}
              </ul>
            </div>

            <div className="px-3">
              {isOpen && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">Akun</p>
              )}
              <ul className="space-y-1">
                <li>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive ? 'bg-gold/10 text-gold font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      } ${!isOpen ? 'lg:justify-center' : ''}`
                    }
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span>Profil</span>}
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${!isOpen ? 'lg:justify-center' : ''}`}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {isOpen && <span>Logout</span>}
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* Footer User Info */}
          {isOpen && userData && (
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gold">{initials}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{userData.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">Driver / Operator</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}