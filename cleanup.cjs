const fs = require('fs');
const path = require('path');

console.log('🗑️  SAFEDRIVE CLEANUP SCRIPT');
console.log('='.repeat(50));
console.log('Menghapus file yang tidak diperlukan untuk skripsi...\n');

// Daftar file dan folder yang akan dihapus
const filesToDelete = [
  // Pages
  'src/pages/user/TripHistory.jsx',
  'src/pages/user/TripDetailPage.jsx',
  'src/pages/user/Alerts.jsx',
  
  // Components
  'src/components/trips',
  
  // Hooks
  'src/hooks/useTrips.js',
  
  // Services
  'src/services/tripService.js'
];

let deletedCount = 0;
let notFoundCount = 0;

filesToDelete.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  try {
    // Check if it's a directory or file
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Delete directory recursively
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Folder dihapus: ${filePath}`);
        deletedCount++;
      } else {
        // Delete file
        fs.unlinkSync(fullPath);
        console.log(`✅ File dihapus: ${filePath}`);
        deletedCount++;
      }
    } else {
      console.log(`⚠️  Tidak ditemukan (skip): ${filePath}`);
      notFoundCount++;
    }
  } catch (error) {
    console.log(`❌ Error menghapus ${filePath}: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`✅ Berhasil dihapus: ${deletedCount} item`);
console.log(`⚠️  Tidak ditemukan: ${notFoundCount} item`);
console.log('='.repeat(50));

console.log('\n📝 LANGKAH SELANJUTNYA:');
console.log('1. Buka src/App.jsx');
console.log('2. Hapus/comment route untuk file yang sudah dihapus');
console.log('3. Hapus import yang tidak terpakai');
console.log('4. Jalankan: npm run dev');
console.log('5. Cek console untuk error\n');