import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { buildEvaluationSeries, chartTickValues, chartTimeWindow, formatDateTime } from '../../utils/behaviorLogic';
import { chartMax, formatNumber } from '../../utils/vehicleLogic';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const DAY_MS = 24 * 60 * 60 * 1000;
const AXIS_TEXT = 'rgba(255, 255, 255, 0.4)';

// Grafik evaluasi perilaku berkendara: kecepatan (km/jam) dan kemiringan jalan (%) dari rekaman berkala
// terhadap waktu, dengan penanda event overspeed dan forced brake pada kecepatannya.
export default function EvaluationChart({ rows, heightClass = 'h-56' }) {
  const series = useMemo(() => buildEvaluationSeries(rows), [rows]);

  const chartData = useMemo(() => ({
    datasets: [
      {
        label: 'Kecepatan',
        data: series.speed,
        yAxisID: 'y',
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: false,
        order: 3,
      },
      {
        label: 'Kemiringan',
        data: series.tilt,
        yAxisID: 'y1',
        borderColor: '#60a5fa',
        backgroundColor: '#60a5fa',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
        spanGaps: false,
        order: 4,
      },
      {
        label: 'Overspeed',
        data: series.overspeed,
        yAxisID: 'y',
        showLine: false,
        pointStyle: 'circle',
        pointRadius: 7,
        pointHoverRadius: 9,
        backgroundColor: '#fb923c',
        borderColor: '#0a0a0f',
        borderWidth: 1,
        order: 2,
      },
      {
        label: 'Forced Brake',
        data: series.forcedBrake,
        yAxisID: 'y',
        showLine: false,
        pointStyle: 'rectRot',
        pointRadius: 5,
        pointHoverRadius: 7,
        backgroundColor: '#ef4444',
        borderColor: '#0a0a0f',
        borderWidth: 1,
        order: 1,
      },
    ],
  }), [series]);

  const options = useMemo(() => {
    const win = chartTimeWindow(series.minX, series.maxX);
    const span = win ? win.max - win.min : 0;
    const speedTop = chartMax([...series.speed, ...series.overspeed, ...series.forcedBrake].map((p) => ({ speed: p.y })));
    const formatTick = (value) => {
      const text = formatDateTime(value); // "dd/mm/yyyy hh.mm.ss"
      if (text === '—') return '';
      return span > DAY_MS ? `${text.slice(0, 5)} ${text.slice(11, 16)}` : text.slice(11, 16);
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: win ? win.min : undefined,
          max: win ? win.max : undefined,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: AXIS_TEXT, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 6, callback: formatTick },
          afterBuildTicks: (axis) => {
            const values = win ? chartTickValues(axis.min, axis.max) : null;
            if (values && values.length >= 2) axis.ticks = values.map((value) => ({ value }));
          },
        },
        y: {
          position: 'left',
          min: 0,
          max: speedTop,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: 'rgba(251, 191, 36, 0.75)', font: { size: 10 }, stepSize: 20 },
          title: { display: true, text: 'km/jam', color: 'rgba(251, 191, 36, 0.75)', font: { size: 10 } },
        },
        y1: {
          position: 'right',
          display: series.hasTilt,
          grid: { drawOnChartArea: false },
          ticks: { color: 'rgba(96, 165, 250, 0.85)', font: { size: 10 } },
          title: { display: true, text: '%', color: 'rgba(96, 165, 250, 0.85)', font: { size: 10 } },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: 'rgba(255, 255, 255, 0.55)', boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 15, 15, 0.92)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            title: (items) => (items.length ? formatDateTime(items[0].parsed.x) : ''),
            label: (context) => {
              const unit = context.dataset.yAxisID === 'y1' ? '%' : 'km/jam';
              return `${context.dataset.label}: ${formatNumber(context.parsed.y, 2)} ${unit}`;
            },
          },
        },
      },
    };
  }, [series]);

  if (!series.hasData) {
    return (
      <div className={`${heightClass} flex items-center justify-center text-gray-500 text-sm text-center px-4`} data-testid="evaluation-chart-empty">
        Belum ada rekaman berkala atau event untuk ditampilkan pada grafik.
      </div>
    );
  }

  return (
    <div className={heightClass} data-testid="evaluation-chart">
      <Line data={chartData} options={options} />
    </div>
  );
}