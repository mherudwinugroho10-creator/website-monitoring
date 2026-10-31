import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Trash2, CheckCheck, Gauge, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlertContext } from '../../context/AlertContext';
import { roleLabel, initialsOf } from '../../utils/profileLogic';

function getAlertIcon(type) {
  switch (type) {
    case 'overspeed': return Gauge;
    case 'forced_brake': return Shield;
    default: return AlertTriangle;
  }
}

function getAlertColor(severity) {
  switch (severity) {
    case 'critical': return 'text-red-500 bg-red-500/10';
    case 'danger': return 'text-red-400 bg-red-500/10';
    case 'warning': return 'text-yellow-400 bg-yellow-500/10';
    default: return 'text-gray-400 bg-gray-500/10';
  }
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'Baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  return Math.floor(s / 86400) + ' hari lalu';
}

export default function Navbar({ toggleSidebar }) {
  const { userData } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll, removeNotification } = useAlertContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const displayName = userData?.name || userData?.email || 'Pengguna';
  const initials = initialsOf(userData?.name || userData?.email);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  function handleBellClick() {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) markAllRead();
  }

  return (
    <header className="h-16 bg-dark-secondary border-b border-white/5 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} aria-label="Menu navigasi" data-testid="nav-menu"
          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-white font-medium">
            {greeting}, <span className="text-gold">{displayName}</span>
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Bell Notification */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={handleBellClick} data-testid="nav-bell"
            aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
            aria-expanded={showDropdown} aria-haspopup="true"
            className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown: pada layar sempit melebar mengikuti layar (bukan 380 px tetap) agar tidak terpotong */}
          {showDropdown && (
            <div data-testid="nav-dropdown"
              className="fixed left-4 right-4 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[380px] max-h-[480px] bg-dark-secondary border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Notifikasi</h3>
                  <p className="text-xs text-gray-500">{notifications.length} notifikasi</p>
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button onClick={markAllRead} aria-label="Tandai semua dibaca" data-testid="nav-mark-read"
                      className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors" title="Tandai semua dibaca">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => { clearAll(); setShowDropdown(false); }} aria-label="Hapus semua notifikasi" data-testid="nav-clear-all"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors" title="Hapus semua">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-[380px] divide-y divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Belum ada notifikasi</p>
                    <p className="text-xs text-gray-600 mt-1">Peringatan overspeed dan forced brake akan muncul di sini</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = getAlertIcon(n.type);
                    const colorClass = getAlertColor(n.severity);
                    return (
                      <div key={n.id} data-testid="nav-notification" className={`px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors ${!n.read ? 'bg-white/[0.01]' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!n.read ? 'text-white' : 'text-gray-300'}`}>{n.message}</p>
                          {n.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.details}</p>}
                          <p className="text-xs text-gray-600 mt-1">{timeAgo(n.timestamp)}</p>
                        </div>
                        <button onClick={() => removeNotification(n.id)} aria-label="Hapus notifikasi ini" data-testid="nav-remove"
                          className="p-1.5 rounded hover:bg-white/5 text-gray-600 hover:text-gray-300 flex-shrink-0 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white" data-testid="nav-user-name">{displayName}</p>
          <p className="text-xs text-gray-500" data-testid="nav-user-role">{roleLabel(userData?.role)}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-gold" data-testid="nav-initials">{initials}</span>
        </div>
      </div>
    </header>
  );
}