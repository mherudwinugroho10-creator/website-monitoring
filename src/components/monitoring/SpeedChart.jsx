import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { chartMax, formatNumber } from '../../utils/vehicleLogic';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// Grafik riwayat kecepatan sejak alat terhubung. Setiap titik membawa batas aktif saat itu,
// sehingga garis batas ikut turun ketika kendaraan memasuki jalan menurun.
export default function SpeedChart({ data, connected }) {
  const max = useMemo(() => chartMax(data), [data]);

  const chartData = useMemo(() => ({
    labels: data.map((d) => d.time),
    datasets: [
      {
        label: 'Kecepatan',
        data: data.map((d) => d.speed),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        fill: true,
        cubicInterpolationMode: 'monotone',
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#fbbf24',
      },
      {
        label: 'Batas',
        data: data.map((d) => d.limit),
        borderColor: 'rgba(239, 68, 68, 0.6)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        stepped: true,
        spanGaps: false,
        pointRadius: 0,
      },
    ],
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300, easing: 'easeOutQuart' },
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10 }, maxRotation: 0, maxTicksLimit: 6 },
      },
      y: {
        min: 0,
        max,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: 'rgba(255, 255, 255, 0.4)', font: { size: 10 }, stepSize: 20 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fbbf24',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => {
            if (context.parsed.y === null || context.parsed.y === undefined) return `${context.dataset.label}: belum diatur`;
            return `${context.dataset.label}: ${formatNumber(context.parsed.y, 2)} km/jam`;
          },
        },
      },
    },
  }), [max]);

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm text-center" data-testid="chart-empty">
        {connected ? 'Mengumpulkan data kecepatan…' : 'Menunggu data dari alat untuk menampilkan grafik'}
      </div>
    );
  }

  return (
    <div className="h-48">
      <Line data={chartData} options={options} />
    </div>
  );
}