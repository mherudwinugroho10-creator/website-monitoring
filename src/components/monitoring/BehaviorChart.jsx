import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TrendingDown, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler, annotationPlugin
);

export default function BehaviorChart({ logs }) {
  var [activeMetric, setActiveMetric] = useState('speed');

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          Grafik Perilaku Mengemudi
        </h3>
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          Belum ada data untuk ditampilkan.
        </div>
      </div>
    );
  }

  // Sort logs by timestamp ascending for chart
  var sortedLogs = logs.slice().sort(function (a, b) {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  var labels = sortedLogs.map(function (log) {
    return new Date(log.timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  // Detect anomalies (sudden changes)
  var speedAnomalies = [];
  var tiltAnomalies = [];

  for (var i = 1; i < sortedLogs.length; i++) {
    var speedDiff = Math.abs(sortedLogs[i].speed - sortedLogs[i - 1].speed);
    var tiltXDiff = Math.abs(Math.abs(sortedLogs[i].tiltX) - Math.abs(sortedLogs[i - 1].tiltX));

    // Speed drop/jump > 20 km/h in 1 interval = anomaly
    if (speedDiff > 20) {
      speedAnomalies.push({
        index: i,
        value: sortedLogs[i].speed,
        diff: speedDiff,
        direction: sortedLogs[i].speed > sortedLogs[i - 1].speed ? 'naik' : 'turun',
        from: sortedLogs[i - 1].speed,
        to: sortedLogs[i].speed
      });
    }

    // Tilt change > 8° in 1 interval = anomaly
    if (tiltXDiff > 8) {
      tiltAnomalies.push({
        index: i,
        value: sortedLogs[i].tiltX,
        diff: tiltXDiff
      });
    }
  }

  // Build annotation lines for anomalies
  var annotations = {};
  var currentAnomalies = activeMetric === 'speed' ? speedAnomalies : tiltAnomalies;

  currentAnomalies.forEach(function (anomaly, idx) {
    annotations['anomaly_' + idx] = {
      type: 'line',
      xMin: anomaly.index,
      xMax: anomaly.index,
      borderColor: 'rgba(255, 107, 107, 0.6)',
      borderWidth: 2,
      borderDash: [4, 4],
      label: {
        display: true,
        content: activeMetric === 'speed'
          ? (anomaly.direction === 'naik' ? '↑' : '↓') + ' ' + Math.round(anomaly.diff) + ' km/h'
          : '⚠ ' + anomaly.diff.toFixed(1) + '°',
        position: 'start',
        backgroundColor: 'rgba(255, 107, 107, 0.8)',
        color: '#fff',
        font: { size: 10, weight: 'bold' },
        padding: 4,
        borderRadius: 4
      }
    };
  });

  var datasets = [];

  if (activeMetric === 'speed') {
    datasets = [
      {
        label: 'Kecepatan (km/h)',
        data: sortedLogs.map(function (l) { return l.speed; }),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: sortedLogs.map(function (_, idx) {
          return speedAnomalies.some(function (a) { return a.index === idx; }) ? 6 : 2;
        }),
        pointBackgroundColor: sortedLogs.map(function (_, idx) {
          return speedAnomalies.some(function (a) { return a.index === idx; }) ? '#ff6b6b' : '#fbbf24';
        }),
        pointBorderColor: sortedLogs.map(function (_, idx) {
          return speedAnomalies.some(function (a) { return a.index === idx; }) ? '#ff6b6b' : '#fbbf24';
        }),
        pointBorderWidth: sortedLogs.map(function (_, idx) {
          return speedAnomalies.some(function (a) { return a.index === idx; }) ? 3 : 1;
        }),
      },
      {
        label: 'Batas Kecepatan',
        data: sortedLogs.map(function () { return 60; }),
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
        tension: 0,
      }
    ];
  } else if (activeMetric === 'tilt') {
    datasets = [
      {
        label: 'Pitch (°)',
        data: sortedLogs.map(function (l) { return l.tiltX; }),
        borderColor: '#74b9ff',
        backgroundColor: 'rgba(116, 185, 255, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Roll (°)',
        data: sortedLogs.map(function (l) { return l.tiltY; }),
        borderColor: '#a29bfe',
        backgroundColor: 'rgba(162, 155, 254, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Batas Pitch (15°)',
        data: sortedLogs.map(function () { return 15; }),
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
      },
      {
        label: 'Batas Roll (10°)',
        data: sortedLogs.map(function () { return 10; }),
        borderColor: 'rgba(253, 203, 110, 0.3)',
        borderWidth: 1,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
      }
    ];
  }

  var chartData = { labels: labels, datasets: datasets };

  var options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: {
          color: 'rgba(255,255,255,0.4)',
          font: { size: 10 },
          maxRotation: 0,
          maxTicksLimit: 10
        }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: {
          color: 'rgba(255,255,255,0.4)',
          font: { size: 10 }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.95)',
        titleColor: '#fff',
        bodyColor: '#ccc',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          afterBody: function (context) {
            var idx = context[0].dataIndex;
            var anomaly = currentAnomalies.find(function (a) { return a.index === idx; });
            if (anomaly && activeMetric === 'speed') {
              return '\n⚠ Perubahan drastis: ' + Math.round(anomaly.from) + ' → ' + Math.round(anomaly.to) + ' km/h';
            }
            return '';
          }
        }
      },
      annotation: { annotations: annotations }
    }
  };

  // Calculate driving consistency metrics
  var speeds = sortedLogs.map(function (l) { return l.speed; });
  var avgSpeed = speeds.reduce(function (a, b) { return a + b; }, 0) / speeds.length;
  var speedVariance = speeds.reduce(function (sum, s) {
    return sum + Math.pow(s - avgSpeed, 2);
  }, 0) / speeds.length;
  var speedStdDev = Math.sqrt(speedVariance);

  // Consistency score: lower std dev = more consistent
  // Scale: 0-100 where 100 is perfectly consistent
  var consistencyScore = Math.max(0, Math.min(100, Math.round(100 - speedStdDev * 2.5)));

  var consistencyColor = consistencyScore >= 80 ? 'text-green-400' :
    consistencyScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  var consistencyBg = consistencyScore >= 80 ? 'bg-green-500/10 border-green-500/20' :
    consistencyScore >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';
  var consistencyLabel = consistencyScore >= 80 ? 'Konsisten' :
    consistencyScore >= 60 ? 'Cukup' : 'Tidak Konsisten';

  var metrics = [
    {
      label: 'Skor Konsistensi',
      value: consistencyScore + '/100',
      sub: consistencyLabel,
      color: consistencyColor,
      bg: consistencyBg
    },
    {
      label: 'Perubahan Kecepatan Drastis',
      value: speedAnomalies.length + 'x',
      sub: 'Selisih > 20 km/h',
      color: speedAnomalies.length > 3 ? 'text-red-400' : speedAnomalies.length > 0 ? 'text-yellow-400' : 'text-green-400',
      bg: speedAnomalies.length > 3 ? 'bg-red-500/10 border-red-500/20' : speedAnomalies.length > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'
    },
    {
      label: 'Rata-rata Kecepatan',
      value: avgSpeed.toFixed(1) + ' km/h',
      sub: 'Std Dev: ' + speedStdDev.toFixed(1),
      color: 'text-gold',
      bg: 'bg-gold/10 border-gold/20'
    },
    {
      label: 'Anomali Kemiringan',
      value: tiltAnomalies.length + 'x',
      sub: 'Selisih > 8°',
      color: tiltAnomalies.length > 2 ? 'text-red-400' : tiltAnomalies.length > 0 ? 'text-yellow-400' : 'text-green-400',
      bg: tiltAnomalies.length > 2 ? 'bg-red-500/10 border-red-500/20' : tiltAnomalies.length > 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-green-500/10 border-green-500/20'
    }
  ];

  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold" />
          Analisis Perilaku Mengemudi
        </h3>
        <div className="flex gap-2">
          <button
            onClick={function () { setActiveMetric('speed'); }}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
              (activeMetric === 'speed'
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'bg-white/5 text-gray-400 border border-white/5 hover:text-white')}
          >
            Kecepatan
          </button>
          <button
            onClick={function () { setActiveMetric('tilt'); }}
            className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' +
              (activeMetric === 'tilt'
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'bg-white/5 text-gray-400 border border-white/5 hover:text-white')}
          >
            Kemiringan
          </button>
        </div>
      </div>

      {/* Consistency Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {metrics.map(function (m, idx) {
          return (
            <div key={idx} className={'rounded-xl border p-3 ' + m.bg}>
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className={'text-lg font-bold font-mono ' + m.color}>{m.value}</p>
              <p className="text-xs text-gray-500">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
        {activeMetric === 'speed' ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#fbbf24]"></div>
              <span className="text-xs text-gray-400">Kecepatan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed border-red-500/40"></div>
              <span className="text-xs text-gray-400">Batas 60 km/h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff6b6b]"></div>
              <span className="text-xs text-gray-400">Perubahan Drastis</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#74b9ff]"></div>
              <span className="text-xs text-gray-400">Pitch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a29bfe]"></div>
              <span className="text-xs text-gray-400">Roll</span>
            </div>
          </>
        )}
      </div>

      {/* Anomaly List */}
      {speedAnomalies.length > 0 && activeMetric === 'speed' && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
            Perubahan Kecepatan Tidak Wajar ({speedAnomalies.length} kejadian)
          </p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {speedAnomalies.map(function (anomaly, idx) {
              var log = sortedLogs[anomaly.index];
              var timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              });
              return (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-mono w-16 flex-shrink-0">{timeStr}</span>
                  {anomaly.direction === 'turun' ? (
                    <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  )}
                  <span className="text-gray-300">
                    {Math.round(anomaly.from)} → {Math.round(anomaly.to)} km/h
                  </span>
                  <span className="text-gray-500">
                    (selisih {Math.round(anomaly.diff)} km/h)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
