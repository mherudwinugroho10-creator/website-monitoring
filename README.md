# SAFEDRIVE

Website monitoring kecepatan, status pengereman, kemiringan jalan, dan Behavior Log pada truk. Data dikirim perangkat IoT berbasis ESP32 ke Firebase dan ditampilkan secara realtime.

Bagian dari skripsi *Implementasi dan Pengujian Website Monitoring Kecepatan, Status Pengereman, Kemiringan Jalan, dan Behavior Log pada Truk*, Muhammad Heru Dwi Nugroho (Notar 23021016), Program Studi Teknologi Rekayasa Otomotif, Politeknik Keselamatan Transportasi Jalan Tegal, 2026.

## Fitur

**Pengemudi** (masuk di `/login`)
- Dashboard: jumlah Overspeed dan Forced Brake hari ini
- Live Monitoring: kecepatan, kemiringan jalan, status exhaust brake, DangerAlert, dan grafik
- Behavior Log: event dan rekaman per sesi, filter, ekspor Excel
- Profil

**Admin** (masuk di `/admin/login`)
- Dashboard: seluruh kendaraan secara realtime dan DangerAlert
- Kelola Pengemudi: tambah, ubah, hapus, aktifkan/nonaktifkan
- Performa Pengemudi: rekap pelanggaran, riwayat sesi, ekspor Excel
- Pengaturan: batas kecepatan jalan datar dan jalan menurun per kendaraan
- Profil

## Teknologi

React 18, Vite 6, Tailwind CSS 3, React Router 6, Firebase 10 (Authentication, Cloud Firestore, Realtime Database), Chart.js, SheetJS (xlsx).

## Menjalankan

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Isi `.env.local` dengan konfigurasi web app dari Firebase Console (Project settings → Your apps).

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi ke `dist/` |
| `npm run preview` | Menjalankan hasil build secara lokal |
| `npm run lint` | Memeriksa kode dengan ESLint |

## Konfigurasi Firebase

Dibaca dari environment variable (lihat `.env.example`). Website menampilkan petunjuk pengisian bila ada yang kurang atau formatnya salah.

| Variabel | Wajib |
|---|---|
| `VITE_FIREBASE_API_KEY` | ya |
| `VITE_FIREBASE_AUTH_DOMAIN` | ya |
| `VITE_FIREBASE_DATABASE_URL` (diawali `https://`) | ya |
| `VITE_FIREBASE_PROJECT_ID` | ya |
| `VITE_FIREBASE_APP_ID` | ya |
| `VITE_FIREBASE_STORAGE_BUCKET` | tidak |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | tidak |
| `VITE_FIREBASE_MEASUREMENT_ID` | tidak |

Berpindah ke proyek Firebase lain cukup mengganti nilai ini, tanpa mengubah kode.

## Deploy ke Vercel

1. Hubungkan repositori ke Vercel (framework Vite terdeteksi otomatis).
2. Isi variabel di atas pada Settings → Environment Variables.
3. Deploy. Nilai variabel ditanam saat build, jadi perubahan variabel baru berlaku setelah deploy ulang.

`vercel.json` mengarahkan semua alamat ke `index.html` agar membuka `/admin` atau `/dashboard` secara langsung tidak menghasilkan 404.

## Akun

- Pengemudi mendaftar sendiri di `/register`. Admin juga dapat menambahkan pengemudi beserta kendaraannya di Kelola Pengemudi; kendaraan terpasang otomatis saat pengemudi mendaftar dengan email tersebut.
- Akun admin tidak dibuat dari website. Buat pengguna di Firebase Authentication, lalu tambahkan dokumen Firestore `users/{uid}` berisi `name`, `email`, `role: "admin"`, dan `status: "active"`.
- Agar admin dapat menyimpan Pengaturan, tambahkan `admins/{uid}: true` di Realtime Database.
- `/login` hanya menerima akun pengemudi dan `/admin/login` hanya akun admin. Pemisahan ini menentukan halaman yang tampil; perlindungan data yang sebenarnya bergantung pada Firebase Security Rules proyek.

## Struktur data Firebase

### Realtime Database (ditulis perangkat ESP32, kecuali `settings` dan `admins`)

```
vehicles/{vehicleId}/live                  data terkini, ditimpa terus
vehicles/{vehicleId}/events/{pushId}       event overspeed / forced_brake
vehicles/{vehicleId}/sessions/{sessionKey} sesi perjalanan
settings/{vehicleId}                       batas kecepatan (ditulis admin dari Pengaturan)
admins/{uid}                               true bila admin boleh menyimpan Pengaturan
```

`vehicleId` sama dengan ID Kendaraan yang diisi admin di Kelola Pengemudi.

`live`

| Field | Isi |
|---|---|
| `gps/speed` | kecepatan, km/jam |
| `tilt` | kemiringan jalan, persen |
| `brake/exhaust_active` | `true` bila exhaust brake aktif |
| `brake/forced` | `true` bila forced brake terjadi |
| `timestamp` | waktu, milidetik sejak epoch |

`events/{pushId}`

| Field | Isi |
|---|---|
| `type` | `overspeed` atau `forced_brake` |
| `speed`, `tilt` | nilai saat kejadian |
| `timestamp` | milidetik sejak epoch |
| `message`, `severity` | teks dan tingkat (`warning`, `danger`, `critical`) |
| `sessionKey` | opsional, sesi tempat event terjadi |

`sessions/{sessionKey}`: `meta/{label, startTime, endTime}` (`endTime` bernilai 0 selama sesi berjalan) dan `behaviorLog/{id}/{timestamp, elapsedSec, speed, tilt, forcedBrake, eventCount}`.

`settings/{vehicleId}`: `speedLimit1` (jalan datar, standar 80 km/jam bila kosong) dan `speedLimit2` (jalan menurun, tanpa nilai standar).

Aturan yang dipakai website:
- Kemiringan ≥ 3% dianggap jalan menurun, selain itu datar.
- Tanpa data `live` baru selama 15 detik, kendaraan dianggap terputus.
- Event yang berumur 5 detik atau kurang memicu DangerAlert.
- Perbandingan waktu memakai jam server Firebase, jadi `timestamp` dari alat harus berupa waktu epoch yang akurat atau nilai server (`{".sv": "timestamp"}`).
- Halaman pengemudi memuat 200 event dan 30 sesi terbaru; rekap admin memuat hingga 1000 event terbaru per kendaraan.

### Cloud Firestore

```
users/{uid}                  name, email, role (user | admin), status (active | inactive),
                             vehicleId, vehicleName, vehiclePlate, phone, createdAt
driverInvites/{email}        name, email, vehicleId, vehicleName, vehiclePlate, createdAt, createdBy
```

## Struktur kode

```
src/
  components/   admin, auth, behavior, common, layout, monitoring
  config/       pembacaan environment variable Firebase
  context/      Auth, Vehicle, Alert
  hooks/        pembacaan data realtime
  pages/        public, user, admin
  services/     inisialisasi Firebase
  utils/        logika murni (tanpa React dan Firebase), ekspor Excel
```