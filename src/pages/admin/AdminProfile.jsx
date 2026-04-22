import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Shield, Save } from 'lucide-react';

export default function AdminProfile() {
  var auth = useAuth();
  var userData = auth.userData;
  var [name, setName] = useState(userData?.name || '');
  var [loading, setLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    await new Promise(function (r) { setTimeout(r, 1000); });
    toast.success('Profil berhasil diperbarui!');
    setLoading(false);
  }

  var initials = userData?.name ? userData.name.split(' ').map(function (n) { return n[0]; }).join('').toUpperCase().slice(0, 2) : 'A';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Admin</h1>
        <p className="text-gray-400 mt-1">Kelola informasi akun administrator.</p>
      </div>

      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-gold/20 via-gold/10 to-purple-500/10 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-2xl bg-dark-secondary border-4 border-dark-secondary flex items-center justify-center">
              <span className="text-xl font-bold text-gold">{initials}</span>
            </div>
          </div>
        </div>
        <div className="pt-14 pb-6 px-6">
          <h2 className="text-lg font-bold text-white">{userData?.name || 'Admin'}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Shield className="w-3.5 h-3.5 text-gold" />
            <span className="text-sm text-gold">Administrator</span>
          </div>
        </div>
      </div>

      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-base font-semibold text-white mb-6">Edit Profil</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nama</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" value={name} onChange={function (e) { setName(e.target.value); }}
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={userData?.email || ''} disabled
                className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary font-semibold rounded-xl transition-all">
            {loading ? <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
            Simpan
          </button>
        </form>
      </div>
    </div>
  );
}