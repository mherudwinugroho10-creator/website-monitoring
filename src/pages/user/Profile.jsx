import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Shield, Calendar, Save, Camera, Key, Bell, Truck } from 'lucide-react';

export default function Profile() {
  var auth = useAuth();
  var userData = auth.userData;

  var [name, setName] = useState(userData?.name || '');
  var [phone, setPhone] = useState(userData?.phone || '');
  var [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    // Simulate save
    await new Promise(function (resolve) { setTimeout(resolve, 1000); });
    toast.success('Profil berhasil diperbarui!');
    setLoading(false);
  }

  var initials = userData?.name ? userData.name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
        <p className="text-gray-400 mt-1">Kelola informasi akun dan preferensi Anda.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-gold/20 via-gold/10 to-blue-500/10 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-dark-secondary border-4 border-dark-secondary flex items-center justify-center">
              <span className="text-2xl font-bold text-gold">{initials}</span>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-6">
          <h2 className="text-xl font-bold text-white">{userData?.name || 'User'}</h2>
          <p className="text-gray-400 text-sm">{userData?.email || 'user@email.com'}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gold/10 text-gold text-xs font-medium">
              <Shield className="w-3 h-3" />
              {userData?.role === 'admin' ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Informasi Pribadi</h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={function (e) { setName(e.target.value); }}
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nomor Telepon</label>
              <div className="relative">
                <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={phone}
                  onChange={function (e) { setPhone(e.target.value); }}
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={userData?.role === 'admin' ? 'Administrator' : 'User'}
                  disabled
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary font-semibold rounded-xl transition-all duration-200"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Informasi Akun</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">Tanggal Bergabung</span>
            </div>
            <span className="text-sm text-white">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '1 Januari 2025'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">Kendaraan Terdaftar</span>
            </div>
            <span className="text-sm text-white">3 Kendaraan</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">User ID</span>
            </div>
            <span className="text-sm text-gray-500 font-mono">{userData?.uid ? userData.uid.slice(0, 12) + '...' : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}