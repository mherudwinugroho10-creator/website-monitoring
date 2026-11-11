import { useId } from 'react';
import logoKampus from '../../assets/logo-kampus.jpg';
import {
  LOGO_CROPS, LOGO_ALT, HIDE_WATERMARK, CHANNEL_SLOPE, CHANNEL_INTERCEPT, cropGeometry,
} from '../../utils/brandLogo';

const GEOMETRY = {
  band: cropGeometry(LOGO_CROPS.band),
  emblem: cropGeometry(LOGO_CROPS.emblem),
};

// Penyaring yang memutihkan piksel latar/watermark (ketiga kanal ≥ titik putih) dan membiarkan sisanya.
// Perhitungannya dalam sRGB (bukan linearRGB bawaan penyaring SVG) supaya ambangnya tepat.
//  1) tiap kanal diubah menjadi 0 atau 1 menurut ambang
//  2) tiga kanal dijumlahkan; hanya piksel yang ketiganya 1 yang bernilai penuh
//  3) hasilnya dipakai sebagai topeng putih, digabung dengan gambar asli secara "lighten"
function WatermarkFilter({ id }) {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <filter id={id} colorInterpolationFilters="sRGB">
        <feComponentTransfer in="SourceGraphic" result="bin">
          <feFuncR type="linear" slope={CHANNEL_SLOPE} intercept={CHANNEL_INTERCEPT} />
          <feFuncG type="linear" slope={CHANNEL_SLOPE} intercept={CHANNEL_INTERCEPT} />
          <feFuncB type="linear" slope={CHANNEL_SLOPE} intercept={CHANNEL_INTERCEPT} />
        </feComponentTransfer>
        <feColorMatrix in="bin" type="matrix" result="sum"
          values="0.34 0.34 0.34 0 0  0.34 0.34 0.34 0 0  0.34 0.34 0.34 0 0  0 0 0 0 1" />
        <feComponentTransfer in="sum" result="mask">
          <feFuncR type="linear" slope="10" intercept="-8.5" />
          <feFuncG type="linear" slope="10" intercept="-8.5" />
          <feFuncB type="linear" slope="10" intercept="-8.5" />
        </feComponentTransfer>
        <feBlend in="SourceGraphic" in2="mask" mode="lighten" />
      </filter>
    </svg>
  );
}

// Logo resmi kampus. Gambar aslinya berlatar putih, jadi ditampilkan di atas pelat putih agar
// warnanya tetap benar di tema gelap. Ukuran ditentukan pemanggil lewat lebar (className, mis. "w-48");
// tingginya mengikuti rasio gambar.
//   variant "band"   : keempat logo berderet
//   variant "emblem" : hanya lambang BPSDM Perhubungan (bulat), untuk ruang sempit
// alt="" bila logo berada di dalam tautan/tombol yang sudah punya nama sendiri.
export default function BrandLogo({ variant = 'band', className = '', alt, testId = 'brand-logo' }) {
  const filterId = `brand-clean-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const isBand = variant !== 'emblem';
  const g = isBand ? GEOMETRY.band : GEOMETRY.emblem;
  const text = alt === undefined ? (isBand ? LOGO_ALT.band : LOGO_ALT.emblem) : alt;

  return (
    <span
      data-testid={testId}
      data-variant={isBand ? 'band' : 'emblem'}
      className={`relative block overflow-hidden bg-white select-none ${isBand ? 'rounded-lg' : 'rounded-full'} ${className}`}
      style={{ aspectRatio: g.aspectRatio }}
    >
      {HIDE_WATERMARK && <WatermarkFilter id={filterId} />}
      <img
        src={logoKampus}
        alt={text}
        draggable={false}
        decoding="async"
        className="absolute max-w-none"
        style={{
          width: g.imageWidth,
          left: g.imageLeft,
          top: g.imageTop,
          filter: HIDE_WATERMARK ? `url(#${filterId})` : undefined,
        }}
      />
    </span>
  );
}