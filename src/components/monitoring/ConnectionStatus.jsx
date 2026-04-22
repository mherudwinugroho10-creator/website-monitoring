import { Wifi, WifiOff, Radio, Clock } from 'lucide-react';

export default function ConnectionStatus({ 
  isConnected = false, 
  lastUpdate = null,
  satellites = 0 
}) {
  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    
    const now = Date.now();
    const diff = now - lastUpdate;
    
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return 'Long ago';
  };

  return (
    <div className="flex items-center gap-4">
      {/* Connection Status */}
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg border
        ${isConnected 
          ? 'bg-status-success/10 border-status-success/20 text-status-success' 
          : 'bg-status-danger/10 border-status-danger/20 text-status-danger'
        }
      `}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Disconnected</span>
          </>
        )}
      </div>

      {/* Satellites */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-tertiary border border-white/5">
        <Radio className="w-4 h-4 text-gold" />
        <span className="text-sm text-gray-400">
          <span className="font-mono text-white">{satellites}</span> satellites
        </span>
      </div>

      {/* Last Update */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-tertiary border border-white/5">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">
          Updated: <span className="text-white">{formatLastUpdate()}</span>
        </span>
      </div>
    </div>
  );
}