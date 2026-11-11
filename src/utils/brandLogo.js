// Geometri dan penyaring tampilan logo kampus (tanpa React, agar bisa diuji).
//
// Gambar resminya satu berkas berukuran 1050 × 388 piksel: empat logo (BLU, SPEED, BPSDM Perhubungan,
// PRESTASI) berderet dalam satu baris, dengan watermark abu-abu sangat pudar di belakangnya. Berkas
// gambar TIDAK diubah. Tiap tampilan hanya memotong bagian yang dibutuhkan lewat CSS (bingkai dengan
// overflow tersembunyi, gambar digeser dan diperbesar di dalamnya). Koordinat di bawah dalam piksel
// gambar asli, lalu diubah menjadi persen, sehingga tetap tepat bila berkasnya diganti versi
// beresolusi lebih tinggi yang berproporsi sama.

export const LOGO_SOURCE = Object.freeze({ width: 1050, height: 388 });

export const LOGO_CROPS = Object.freeze({
  // Keempat logo dengan ruang putih secukupnya di sekelilingnya.
  band: Object.freeze({ x: 66, y: 138, width: 900, height: 124 }),
  // Hanya lambang BPSDM Perhubungan, untuk ruang sempit (sidebar saat diciutkan dan ikon tab).
  emblem: Object.freeze({ x: 548, y: 154, width: 92, height: 92 }),
});

// Teks alternatif: hanya yang benar-benar terlihat pada gambar.
export const LOGO_ALT = Object.freeze({
  band: 'Logo BLU, SPEED, BPSDM Perhubungan, dan PRESTASI BPSDMP Next Generation',
  emblem: 'Lambang BPSDM Perhubungan',
});

function pct(value) {
  return `${Number(value.toFixed(4))}%`;
}

// Ukuran bingkai (rasio) dan letak gambar penuh di dalam bingkai, semuanya dalam persen bingkai.
export function cropGeometry(crop, source = LOGO_SOURCE) {
  const inside = crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0
    && crop.x + crop.width <= source.width && crop.y + crop.height <= source.height;
  if (!inside) throw new RangeError('Kotak potong logo berada di luar gambar.');
  return {
    aspectRatio: `${crop.width} / ${crop.height}`,
    imageWidth: pct((source.width / crop.width) * 100),
    imageLeft: pct(-(crop.x / crop.width) * 100),
    imageTop: pct(-(crop.y / crop.height) * 100),
  };
}

// ── Menyembunyikan watermark ────────────────────────────────────────────────────────────────────
// Watermark pada gambar hanya berupa abu-abu terang: hasil pengukuran, hampir seluruh pikselnya bernilai
// 230 sampai 255 pada ketiga kanal (R, G, B), sedangkan bagian logo punya sedikitnya satu kanal di bawah 228
// (warna jenuh atau gelap). Penyaring SVG di bawah memutihkan setiap piksel yang ketiga kanalnya sudah
// >= WHITE_POINT dan tidak menyentuh piksel lain, sehingga warna dan bentuk logo tidak berubah (selisih
// terbesar pada satu kanal hanya 27 dari 255, dan hanya pada piksel yang sudah hampir putih). Berkas gambarnya
// tetap utuh; ini hanya cara menampilkannya. Ubah HIDE_WATERMARK menjadi false untuk menampilkan watermark.
export const HIDE_WATERMARK = true;
export const WHITE_POINT = 228;

// Fungsi transfer linear penyaring (nilai kanal 0..1): kemiringan 255 dan geseran −(WHITE_POINT − 1)
// membuat keluaran tepat 0 untuk kanal < WHITE_POINT dan 1 untuk kanal ≥ WHITE_POINT.
export const CHANNEL_SLOPE = 255;
export const CHANNEL_INTERCEPT = -(WHITE_POINT - 1);

// Ringkasan yang sama dalam bentuk fungsi biasa (dipakai pengujian): apakah piksel dianggap latar putih?
export function isWatermarkPixel(r, g, b, whitePoint = WHITE_POINT) {
  return r >= whitePoint && g >= whitePoint && b >= whitePoint;
}