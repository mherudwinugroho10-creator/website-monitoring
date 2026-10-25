import { Truck } from 'lucide-react';

// Ditampilkan di halaman pengemudi yang akunnya belum dikaitkan dengan kendaraan oleh admin.
export default function NoVehicleNotice() {
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-8 text-center" data-testid="no-vehicle">
      <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
        <Truck className="w-7 h-7 text-gold" />
      </div>
      <h2 className="text-lg font-semibold text-white">Kendaraan belum ditetapkan</h2>
      <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
        Akun Anda belum dikaitkan dengan kendaraan. Hubungi admin untuk menetapkan kendaraan, lalu muat ulang halaman ini.
      </p>
    </div>
  );
}