import { useEffect, useRef } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SpeedVariationChart({ 
  data = [], 
  events = [],
  timeRange = 60 // minutes
}) {
  const chartRef = useRef(null);
  
  // Prepare chart data
  const labels = data.map((item, index) => {
    const date = new Date(item.timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  });
  
  const speeds = data.map(item => item.speed_avg || 0);
  
  // Event markers
  const eventPoints = events.map(event => ({
    x: event.timestamp ? new Date(event.timestamp).toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '',
    y: event.speed_after || 0,
    type: event.type,
    severity: event.severity
  }));
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Speed (km/h)',
        data: speeds,
        borderColor: '#d4af37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#d4af37',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
      // Speed limit line
      {
        label: 'Speed Limit',
        data: new Array(labels.length).fill(60),
        borderColor: '#ff6b6b',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
    ]
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#a0a0b0',
          font: {
            family: 'Outfit',
            size: 11
          },
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 26, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#a0a0b0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} km/h`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6c6c7c',
          font: {
            family: 'Outfit',
            size: 10
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: '#6c6c7c',
          font: {
            family: 'Outfit',
            size: 10
          },
          callback: function(value) {
            return value + ' km/h';
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };
  
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Speed Variation</h3>
          <p className="text-xs text-gray-500 mt-1">
            Last {timeRange} minutes analysis
          </p>
        </div>
        
        {/* Event legend */}
        {events.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-400">
                {events.filter(e => e.severity === 'high').length} High Events
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-400">
                {events.filter(e => e.severity === 'medium').length} Medium Events
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div style={{ height: '300px' }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Event markers below chart */}
      {events.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="text-xs font-medium text-gray-400 mb-2">Event Timeline:</div>
          <div className="flex flex-wrap gap-2">
            {events.slice(0, 5).map((event, index) => (
              <div 
                key={index}
                className={`px-2 py-1 rounded-lg text-xs ${
                  event.type === 'sudden_deceleration' 
                    ? 'bg-red-500/10 text-red-400' 
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {event.type === 'sudden_deceleration' ? '↓' : '↑'} 
                {Math.abs(event.delta).toFixed(0)} km/h
                <span className="text-gray-500 ml-1">
                  {new Date(event.timestamp).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            ))}
            {events.length > 5 && (
              <div className="px-2 py-1 rounded-lg text-xs bg-white/5 text-gray-500">
                +{events.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}