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
import {
  buildEvaluationSeries, buildTimelineLayout, chartTickValues, chartTimeWindow, formatDateTime,
} from '../../utils/behaviorLogic';
import { chartMax, formatNumber } from '../../utils/vehicleLogic';

// Garis putus-putus di celah antar segmen waktu (grafik Gabungan) dan nama sesi di atas tiap segmen.
// Aktif hanya bila options.plugins.segmentGuides berisi { gaps, labels }; selain itu tidak menggambar apa pun.
const segmentGuides = {
  id: 'segmentGuides',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !opts.gaps) return;
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([4, 4]);
    for (const g of opts.gaps) {
      const px = xScale.getPixelForValue(g);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const l of opts.labels || []) {
      if (l.text) ctx.fillText(l.text, xScale.getPixelForValue(l.x), chartArea.top - 3);
    }
    ctx.restore();
  },
};

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, segmentGuides);

const DAY_MS = 24 * 60 * 60 * 1000;
const AXIS_TEXT = 'rgba(255, 255, 255, 0.4)';

// Grafik evaluasi perilaku berkendara: kecepatan (km/jam) dan kemiringan jalan (%) dari rekaman berkala
// terhadap waktu, dengan penanda event overspeed dan forced brake pada kecepatannya.
export default function EvaluationChart({ rows, heightClass = 'h-56' }) {
  // Beberapa segmen waktu yang berjauhan (mis. beberapa sesi) -> garis waktu dipadatkan; satu segmen -> sumbu waktu biasa.
  const layout = useMemo(() => buildTimelineLayout(rows), [rows]);
  const series = useMemo(() => buildEvaluationSeries(rows, layout), [rows, layout]);

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
    const win = layout ? layout.window : chartTimeWindow(series.minX, series.maxX);
    const span = win ? win.max - win.min : 0;
    const compactLabels = layout ? new Map(layout.ticks.map((t) => [t.x, t.label])) : null;
    const speedTop = chartMax([...series.speed, ...series.overspeed, ...series.forcedBrake].map((p) => ({ speed: p.y })));
    const formatTick = (value) => {
      if (compactLabels) return compactLabels.get(value) || '';
      const text = formatDateTime(value); // "dd/mm/yyyy hh.mm.ss"
      if (text === '—') return '';
      return span > DAY_MS ? `${text.slice(0, 5)} ${text.slice(11, 16)}` : text.slice(11, 16);
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: { padding: { top: layout ? 14 : 0 } },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: win ? win.min : undefined,
          max: win ? win.max : undefined,
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: AXIS_TEXT, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 6, callback: formatTick },
          afterBuildTicks: (axis) => {
            if (layout) {
              axis.ticks = layout.ticks.map((t) => ({ value: t.x }));
              return;
            }
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
        segmentGuides: layout
          ? { gaps: layout.gaps, labels: layout.segments.map((g) => ({ x: (g.x0 + g.x1) / 2, text: g.label })) }
          : false,
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
            title: (items) => {
              if (!items.length) return '';
              const raw = items[0].raw;
              return formatDateTime(raw && typeof raw.t === 'number' ? raw.t : items[0].parsed.x);
            },
            label: (context) => {
              const unit = context.dataset.yAxisID === 'y1' ? '%' : 'km/jam';
              return `${context.dataset.label}: ${formatNumber(context.parsed.y, 2)} ${unit}`;
            },
          },
        },
      },
    };
  }, [series, layout]);

  if (!series.hasData) {
    return (
      <div className={`${heightClass} flex items-center justify-center text-gray-500 text-sm text-center px-4`} data-testid="evaluation-chart-empty">
        Belum ada data.
      </div>
    );
  }

  return (
    <div className={heightClass} data-testid="evaluation-chart">
      <Line data={chartData} options={options} />
    </div>
  );
}