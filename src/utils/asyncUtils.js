// Pembantu asinkron umum.

// Menolak dengan galat berkode `code` bila janji belum selesai dalam `ms` milidetik.
// Janji aslinya tidak dibatalkan (penulisan Firebase yang tertunda tetap dikirim saat koneksi pulih).
export function withTimeout(promise, ms, code = 'app/timeout') {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Waktu tunggu habis');
      err.code = code;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}