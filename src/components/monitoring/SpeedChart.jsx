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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SpeedChart({ data, maxSpeed }) {
  var limit = maxSpeed || 60;

  var chartData = {
    labels: data.map(function (d) { return d.time; }),
    datasets: [
      {
        label: 'Kecepatan',
        data: data.map(function (d) { return d.speed; }),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#fbbf24',
      },
      {
        label: 'Batas',
        data: data.map(function () { return limit; }),
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
      },
    ],
  };

  var options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
      easing: 'easeOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: { size: 10 },
          maxRotation: 0,
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        min: 0,
        max: 120,
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: { size: 10 },
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 15, 15, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fbbf24',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: function (context) {
            return context.parsed.y + ' km/h';
          },
        },
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        Mulai simulasi untuk melihat grafik
      </div>
    );
  }

  return (
    <div className="h-48">
      <Line data={chartData} options={options} />
    </div>
  );
}