import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom truck icon — gold circle with arrow
const createTruckIcon = (heading = 0) => {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 40px; height: 40px;
        background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.2);
        transform: rotate(${heading}deg);
        border: 2px solid rgba(255,255,255,0.2);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" stroke-width="2.5">
          <path d="M12 2L19 21H5L12 2Z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Auto-center map on position change
function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
    }
  }, [center, map]);

  // Force resize setelah mount — fix map tidak full
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);

  return null;
}

export default function LiveMap({
  position = { lat: -6.966667, lng: 110.419444 },
  heading = 0,
  route = [],
  zoom = 16
}) {
  const center = [position.lat, position.lng];

  return (
    <div className="relative w-full h-full" style={{ minHeight: '280px' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#0a0a0f', borderRadius: '12px' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            positions={route.map(p => [p.lat, p.lng])}
            pathOptions={{ color: '#d4af37', weight: 4, opacity: 0.7, dashArray: '10, 10' }}
          />
        )}

        {/* Vehicle marker */}
        <Marker position={center} icon={createTruckIcon(heading)}>
          <Popup>
            <div style={{ color: '#0a0a0f', padding: '4px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>Posisi Kendaraan</p>
              <p style={{ fontSize: '12px' }}>Lat: {position.lat.toFixed(6)}</p>
              <p style={{ fontSize: '12px' }}>Lng: {position.lng.toFixed(6)}</p>
            </div>
          </Popup>
        </Marker>

        <MapUpdater center={center} />
      </MapContainer>

      {/* Coordinates overlay */}
      <div className="absolute bottom-3 left-3 bg-dark-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/[0.08] z-[1000]">
        <div className="flex items-center gap-2 text-xs">
          <Navigation className="w-3.5 h-3.5 text-gold" />
          <span className="text-gray-400">Lat:</span>
          <span className="font-mono text-white">{position.lat.toFixed(6)}</span>
          <span className="text-gray-400 ml-1">Lng:</span>
          <span className="font-mono text-white">{position.lng.toFixed(6)}</span>
        </div>
      </div>

      {/* Heading overlay */}
      <div className="absolute top-3 right-3 bg-dark-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/[0.08] z-[1000]">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center"
            style={{ transform: `rotate(${heading}deg)` }}>
            <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-gold" />
          </div>
          <span className="font-mono text-white">{heading}°</span>
        </div>
      </div>
    </div>
  );
}