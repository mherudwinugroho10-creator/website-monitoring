import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pustaka besar dipisah menjadi berkas sendiri agar bisa di-cache terpisah dan tidak ikut diunduh
// saat tidak diperlukan: xlsx hanya dimuat saat ekspor, chart.js hanya di halaman yang memakai grafik.
// Firebase dipecah per layanan (Auth, Firestore, Realtime Database) agar tiap berkas tetap wajar
// ukurannya dan diunduh paralel.
function vendorChunk(id) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('/xlsx/')) return 'xlsx'
  if (id.includes('/@firebase/firestore/') || id.includes('/node_modules/firebase/firestore/')) return 'firebase-firestore'
  if (id.includes('/@firebase/database/') || id.includes('/node_modules/firebase/database/')) return 'firebase-database'
  if (id.includes('/@firebase/auth/') || id.includes('/node_modules/firebase/auth/')) return 'firebase-auth'
  if (id.includes('/node_modules/firebase/') || id.includes('/@firebase/')) return 'firebase'
  if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) return 'charts'
  if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) return 'react'
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
})