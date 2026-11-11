import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, FileText, User, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../common/BrandLogo';
import { toast } from 'react-toastify';

export default function UserSidebar({ isOpen, setIsOpen }) {
  const { logout } = useAuth();
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
          <div className="h-16 flex items-center justify-between gap-3 px-4 border-b border-white/[0.06]">
            <div className={`flex items-center min-w-0 ${isOpen ? 'flex-1' : 'lg:justify-center lg:w-full'}`}>
              {isOpen
                ? <BrandLogo className="w-full" />
                : <BrandLogo variant="emblem" className="w-10 flex-shrink-0" />}
            </div>
            {isOpen && (
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors lg:hidden">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

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

        </div>
      </aside>
    </div>
  );
}